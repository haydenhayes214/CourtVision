import json
import os
import time
from pathlib import Path
from typing import Any, Optional


class CacheStore:
    def get(self, key: str) -> Optional[Any]:
        raise NotImplementedError

    def set(self, key: str, value: Any) -> None:
        raise NotImplementedError


class LocalJsonCacheStore(CacheStore):
    def __init__(self, cache_dir: str):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        return self.cache_dir / f"{key}.json"

    def get(self, key: str) -> Optional[Any]:
        path = self._path(key)
        if not path.exists():
            return None
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def set(self, key: str, value: Any) -> None:
        with self._path(key).open("w", encoding="utf-8") as file:
            json.dump(value, file, indent=2)


class DynamoDbCacheStore(CacheStore):
    def __init__(self, table_name: str, ttl_seconds: int):
        import boto3
        from botocore.exceptions import ClientError

        self.client_error = ClientError
        self.table = boto3.resource("dynamodb", region_name=_aws_region()).Table(table_name)
        self.s3 = boto3.client("s3", region_name=_aws_region())
        self.s3_bucket_name = os.getenv("COURTVISION_S3_CACHE_BUCKET")
        self.s3_prefix = os.getenv("COURTVISION_S3_CACHE_PREFIX", "cache").strip("/")
        self.ttl_seconds = ttl_seconds

    def _s3_object_key(self, key: str) -> str:
        filename = f"{key}.json"
        return f"{self.s3_prefix}/{filename}" if self.s3_prefix else filename

    def get(self, key: str) -> Optional[Any]:
        try:
            response = self.table.get_item(Key={"cache_key": key})
        except self.client_error:
            return None

        item = response.get("Item")
        if not item:
            return None

        expires_at = int(item.get("expires_at", 0))
        if expires_at and expires_at < int(time.time()):
            return None

        if "s3_key" in item:
            try:
                s3_response = self.s3.get_object(Bucket=item["s3_bucket"], Key=item["s3_key"])
            except self.client_error:
                return None
            return json.loads(s3_response["Body"].read().decode("utf-8"))

        return json.loads(item["payload"])

    def set(self, key: str, value: Any) -> None:
        expires_at = int(time.time()) + self.ttl_seconds
        payload = json.dumps(value)
        if len(payload.encode("utf-8")) > 350000 and self.s3_bucket_name:
            s3_key = self._s3_object_key(key)
            self.s3.put_object(
                Bucket=self.s3_bucket_name,
                Key=s3_key,
                Body=payload.encode("utf-8"),
                ContentType="application/json",
            )
            self.table.put_item(
                Item={
                    "cache_key": key,
                    "s3_bucket": self.s3_bucket_name,
                    "s3_key": s3_key,
                    "expires_at": expires_at,
                }
            )
            return

        self.table.put_item(
            Item={
                "cache_key": key,
                "payload": payload,
                "expires_at": expires_at,
            }
        )


class S3JsonCacheStore(CacheStore):
    def __init__(self, bucket_name: str, prefix: str, ttl_seconds: int):
        import boto3
        from botocore.exceptions import ClientError

        self.client_error = ClientError
        self.s3 = boto3.client("s3", region_name=_aws_region())
        self.bucket_name = bucket_name
        self.prefix = prefix.strip("/")
        self.ttl_seconds = ttl_seconds

    def _object_key(self, key: str) -> str:
        filename = f"{key}.json"
        return f"{self.prefix}/{filename}" if self.prefix else filename

    def get(self, key: str) -> Optional[Any]:
        try:
            response = self.s3.get_object(Bucket=self.bucket_name, Key=self._object_key(key))
        except self.client_error:
            return None

        envelope = json.loads(response["Body"].read().decode("utf-8"))
        expires_at = int(envelope.get("expires_at", 0))
        if expires_at and expires_at < int(time.time()):
            return None

        return envelope.get("payload")

    def set(self, key: str, value: Any) -> None:
        envelope = {
            "expires_at": int(time.time()) + self.ttl_seconds,
            "payload": value,
        }
        self.s3.put_object(
            Bucket=self.bucket_name,
            Key=self._object_key(key),
            Body=json.dumps(envelope).encode("utf-8"),
            ContentType="application/json",
        )


def build_cache_store(cache_dir: str) -> CacheStore:
    backend = os.getenv("COURTVISION_CACHE_BACKEND", "local").lower()
    ttl_seconds = int(os.getenv("COURTVISION_CACHE_TTL_SECONDS", "604800"))

    if backend == "dynamodb":
        table_name = os.getenv("COURTVISION_DYNAMODB_TABLE")
        if not table_name:
            raise RuntimeError("COURTVISION_DYNAMODB_TABLE is required when COURTVISION_CACHE_BACKEND=dynamodb")
        return DynamoDbCacheStore(table_name=table_name, ttl_seconds=ttl_seconds)

    if backend == "s3":
        bucket_name = os.getenv("COURTVISION_S3_CACHE_BUCKET")
        if not bucket_name:
            raise RuntimeError("COURTVISION_S3_CACHE_BUCKET is required when COURTVISION_CACHE_BACKEND=s3")
        return S3JsonCacheStore(
            bucket_name=bucket_name,
            prefix=os.getenv("COURTVISION_S3_CACHE_PREFIX", "cache"),
            ttl_seconds=ttl_seconds,
        )

    return LocalJsonCacheStore(cache_dir=cache_dir)


def _aws_region() -> Optional[str]:
    return os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION_NAME")
