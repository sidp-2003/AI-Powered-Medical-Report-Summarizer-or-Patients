import os
import uuid
import copy
import json
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from pymongo import MongoClient, DESCENDING, ASCENDING
from pymongo.collection import Collection

load_dotenv()

_CLIENT: Optional[MongoClient] = None
_COLLECTION: Optional[Collection] = None
_REMINDERS_COLLECTION: Optional[Collection] = None


def _to_iso_utc(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)
        return value.isoformat()
    return str(value)


def _coerce_int(value: Optional[str], default: int) -> int:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except ValueError:
        return default


def _discover_mongodb_uri() -> str:
    uri = (
        os.getenv("MONGODB_URI")
        or os.getenv("MONGO_URI")
        or os.getenv("MONGO_CONNECTION_STRING")
    )
    if uri:
        return uri

    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if line.startswith("mongodb://") or line.startswith("mongodb+srv://"):
                    return line

    raise RuntimeError(
        "MongoDB URI not found. Set MONGODB_URI (or MONGO_URI) in backend/.env"
    )


def _get_collection() -> Collection:
    global _CLIENT, _COLLECTION
    if _COLLECTION is not None:
        return _COLLECTION

    mongodb_uri = _discover_mongodb_uri()
    db_name = os.getenv("MONGODB_DB_NAME", "clarimed")
    collection_name = os.getenv("MONGODB_REPORTS_COLLECTION", "reports")

    _CLIENT = MongoClient(
        mongodb_uri,
        serverSelectionTimeoutMS=_coerce_int(os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS"), 5000),
        connectTimeoutMS=_coerce_int(os.getenv("MONGODB_CONNECT_TIMEOUT_MS"), 10000),
        socketTimeoutMS=_coerce_int(os.getenv("MONGODB_SOCKET_TIMEOUT_MS"), 30000),
        maxPoolSize=_coerce_int(os.getenv("MONGODB_MAX_POOL_SIZE"), 100),
        minPoolSize=_coerce_int(os.getenv("MONGODB_MIN_POOL_SIZE"), 0),
        maxIdleTimeMS=_coerce_int(os.getenv("MONGODB_MAX_IDLE_TIME_MS"), 300000),
    )
    _CLIENT.admin.command("ping")

    _COLLECTION = _CLIENT[db_name][collection_name]
    _COLLECTION.create_index([("user_email", DESCENDING), ("created_at", DESCENDING)])
    _COLLECTION.create_index([("created_at", DESCENDING)])
    return _COLLECTION


def _get_reminders_collection() -> Collection:
    global _REMINDERS_COLLECTION
    if _REMINDERS_COLLECTION is not None:
        return _REMINDERS_COLLECTION

    _ = _get_collection()
    db_name = os.getenv("MONGODB_DB_NAME", "clarimed")
    reminders_collection_name = os.getenv("MONGODB_REMINDERS_COLLECTION", "reminders")

    _REMINDERS_COLLECTION = _CLIENT[db_name][reminders_collection_name]
    _REMINDERS_COLLECTION.create_index([("user_email", DESCENDING), ("due_at", DESCENDING)])
    _REMINDERS_COLLECTION.create_index([("due_at", DESCENDING)])
    _REMINDERS_COLLECTION.create_index([("user_email", DESCENDING), ("status", DESCENDING), ("due_at", ASCENDING)])
    _REMINDERS_COLLECTION.create_index([("notification_sent_at", DESCENDING)])
    return _REMINDERS_COLLECTION


def save_report(user_email: str, analysis_data: Dict[str, Any]) -> str:
    report_id = str(uuid.uuid4())
    created_at_dt = datetime.now(timezone.utc)
    created_at_iso = created_at_dt.isoformat()
    health_score = int(analysis_data.get("health_score") or 0)

    payload = copy.deepcopy(analysis_data)
    payload["id"] = report_id
    payload["created_at"] = created_at_iso

    doc = {
        "_id": report_id,
        "user_email": user_email,
        "created_at": created_at_dt,
        "health_score": health_score,
        "report_json": payload,
    }

    collection = _get_collection()
    collection.insert_one(doc)
    return report_id


def _serialize_reminder(row: Dict[str, Any]) -> Dict[str, Any]:
    created_at = row.get("created_at")
    due_at = row.get("due_at")
    notification_sent_at = row.get("notification_sent_at")
    email_sent_at = row.get("email_sent_at")
    return {
        "id": row.get("_id"),
        "user_email": row.get("user_email"),
        "report_id": row.get("report_id"),
        "health_score": row.get("health_score"),
        "remind_in_days": row.get("remind_in_days"),
        "created_at": _to_iso_utc(created_at),
        "due_at": _to_iso_utc(due_at),
        "status": row.get("status", "scheduled"),
        "channel": row.get("channel", "in_app"),
        "notification_sent_at": _to_iso_utc(notification_sent_at),
        "email_sent_at": _to_iso_utc(email_sent_at),
    }


def get_reminders_by_report_ids(user_email: str, report_ids: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    if not report_ids:
        return {}

    collection = _get_reminders_collection()
    cursor = collection.find(
        {
            "user_email": user_email,
            "status": "scheduled",
            "report_id": {"$in": report_ids},
        }
    ).sort("due_at", ASCENDING)

    reminders_map: Dict[str, List[Dict[str, Any]]] = {}
    for row in cursor:
        report_id = row.get("report_id")
        if not report_id:
            continue
        reminders_map.setdefault(report_id, []).append(_serialize_reminder(row))

    return reminders_map


def get_reports_by_user(user_email: str) -> List[Dict[str, Any]]:
    collection = _get_collection()
    cursor = collection.find({"user_email": user_email}).sort("created_at", DESCENDING)

    rows = list(cursor)
    report_ids = [str(row.get("_id")) for row in rows if row.get("_id")]
    reminders_map = get_reminders_by_report_ids(user_email, report_ids)

    results: List[Dict[str, Any]] = []
    for row in rows:
        raw_payload = row.get("report_json") or {}
        if isinstance(raw_payload, str):
            try:
                raw_payload = json.loads(raw_payload)
            except json.JSONDecodeError:
                raw_payload = {}

        data = dict(raw_payload)
        data["id"] = row.get("_id")
        created_at = row.get("created_at")
        data["created_at"] = _to_iso_utc(created_at)
        data["notifications"] = reminders_map.get(str(row.get("_id")), [])
        results.append(data)
    return results


def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    collection = _get_collection()
    row = collection.find_one({"_id": report_id})
    if not row:
        return None

    raw_payload = row.get("report_json") or {}
    if isinstance(raw_payload, str):
        try:
            raw_payload = json.loads(raw_payload)
        except json.JSONDecodeError:
            raw_payload = {}

    data = dict(raw_payload)
    data["id"] = row.get("_id")
    created_at = row.get("created_at")
    data["created_at"] = _to_iso_utc(created_at)
    user_email = row.get("user_email")
    if user_email:
        reminders_map = get_reminders_by_report_ids(str(user_email), [report_id])
        data["notifications"] = reminders_map.get(report_id, [])
    else:
        data["notifications"] = []
    return data


def report_belongs_to_user(report_id: str, user_email: str) -> bool:
    collection = _get_collection()
    row = collection.find_one(
        {"_id": report_id, "user_email": user_email},
        projection={"_id": 1},
    )
    return row is not None


def delete_report_for_user(report_id: str, user_email: str) -> bool:
    reports_collection = _get_collection()
    reminders_collection = _get_reminders_collection()

    delete_result = reports_collection.delete_one({"_id": report_id, "user_email": user_email})
    if delete_result.deleted_count <= 0:
        return False

    reminders_collection.delete_many({"report_id": report_id, "user_email": user_email})
    return True


def save_test_reminder(
    user_email: str,
    remind_in_days: int,
    report_id: Optional[str] = None,
    health_score: Optional[int] = None,
) -> Dict[str, Any]:
    days = max(1, int(remind_in_days))
    reminder_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    due_at = created_at + timedelta(days=days)

    doc = {
        "_id": reminder_id,
        "user_email": user_email,
        "report_id": report_id,
        "health_score": health_score,
        "remind_in_days": days,
        "created_at": created_at,
        "due_at": due_at,
        "status": "scheduled",
        "channel": "in_app",
        "notification_sent_at": None,
        "email_sent_at": None,
    }

    collection = _get_reminders_collection()
    collection.insert_one(doc)

    return {
        "id": reminder_id,
        "user_email": user_email,
        "report_id": report_id,
        "health_score": health_score,
        "remind_in_days": days,
        "created_at": created_at.isoformat(),
        "due_at": due_at.isoformat(),
        "status": "scheduled",
    }


def get_test_reminders_by_user(user_email: str) -> List[Dict[str, Any]]:
    collection = _get_reminders_collection()
    cursor = collection.find({"user_email": user_email, "status": "scheduled"}).sort("due_at", ASCENDING)

    reminders: List[Dict[str, Any]] = []
    for row in cursor:
        reminders.append(_serialize_reminder(row))
    return reminders


def get_due_reminders_by_user(user_email: str) -> List[Dict[str, Any]]:
    collection = _get_reminders_collection()
    now_utc = datetime.now(timezone.utc)
    cursor = collection.find(
        {
            "user_email": user_email,
            "status": "scheduled",
            "due_at": {"$lte": now_utc},
            "$or": [
                {"email_sent_at": None},
                {"email_sent_at": {"$exists": False}},
            ],
        }
    ).sort("due_at", ASCENDING)

    reminders: List[Dict[str, Any]] = []
    for row in cursor:
        reminders.append(_serialize_reminder(row))
    return reminders


def mark_reminder_as_notified(reminder_id: str, user_email: str) -> bool:
    collection = _get_reminders_collection()
    result = collection.update_one(
        {
            "_id": reminder_id,
            "user_email": user_email,
            "$or": [
                {"notification_sent_at": None},
                {"notification_sent_at": {"$exists": False}},
            ],
        },
        {
            "$set": {
                "notification_sent_at": datetime.now(timezone.utc),
            }
        },
    )
    return result.modified_count > 0


def mark_reminder_as_emailed(reminder_id: str, user_email: str) -> bool:
    collection = _get_reminders_collection()
    result = collection.update_one(
        {
            "_id": reminder_id,
            "user_email": user_email,
            "$or": [
                {"email_sent_at": None},
                {"email_sent_at": {"$exists": False}},
            ],
        },
        {
            "$set": {
                "email_sent_at": datetime.now(timezone.utc),
            }
        },
    )
    return result.modified_count > 0
