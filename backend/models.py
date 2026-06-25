from pydantic import BaseModel, field_validator


def normalize_email(value: str):
    email = value.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise ValueError("Enter a valid email address")
    return email


def validate_password(value: str):
    if len(value.strip()) < 6:
        raise ValueError("Password must be at least 6 characters")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password cannot be longer than 72 bytes")
    return value


class UserSignup(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def username_required(cls, value):
        if not value.strip():
            raise ValueError("Name is required")
        return value.strip()

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def strong_password(cls, value):
        return validate_password(value)


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def password_required(cls, value):
        if not value:
            raise ValueError("Password is required")
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password cannot be longer than 72 bytes")
        return value
