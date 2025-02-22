# Authentication Implementation

## Overview
This document details the implementation of user registration, authentication, and authorization for the Seadragon LLM system. It covers both basic authentication for the admin panel and a more general authentication system for users accessing the web interface.

## Steps

1.  **Database Models:**

    *Task Description:* Define SQLAlchemy models for `User` and `RegistrationToken` in `backend/app/auth/models.py`. These models will represent users and registration tokens in the database.

    ```python
    # backend/app/auth/models.py
    from sqlalchemy import Column, Integer, String, DateTime, Boolean
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.sql import func

    Base = declarative_base()

    class User(Base):
        __tablename__ = "users"
        id = Column(Integer, primary_key=True)
        username = Column(String, unique=True)
        password_hash = Column(String)
        is_admin = Column(Boolean, default=False)
        registration_token = Column(String)
        created_at = Column(DateTime, server_default=func.now())

    class RegistrationToken(Base):
        __tablename__ = "registration_tokens"
        id = Column(Integer, primary_key=True)
        token = Column(String, unique=True)
        used = Column(Boolean, default=False)
        created_at = Column(DateTime, server_default=func.now())

    ```

2.  **Utility Functions:**

    *Task Description:* Create utility functions for password hashing, password verification, and JWT token creation in `backend/app/auth/utils.py`.

    ```python
    # backend/app/auth/utils.py
    from passlib.context import CryptContext
    from jose import JWTError, jwt
    from datetime import datetime, timedelta
    from typing import Optional

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    SECRET_KEY = "your-secret-key"  # Replace with a strong, randomly generated secret
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30

    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def create_jwt_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    ```

3.  **Authentication Router:**

    *Task Description:* Create an API router (`backend/app/auth/router.py`) to handle registration and login endpoints.

    ```python
    # backend/app/auth/router.py
    from fastapi import APIRouter, Depends, HTTPException, status
    from sqlalchemy.orm import Session
    from .models import User, RegistrationToken, Base
    from .utils import create_jwt_token, get_password_hash, verify_password
    from ...db import get_db  # Assuming a database connection setup in a 'db.py' file
    from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

    router = APIRouter()
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")  # For Swagger UI

    @router.post("/register")
    async def register(username: str, password: str, token: str, db: Session = Depends(get_db)):
        # Validate registration token
        db_token = db.query(RegistrationToken).filter(RegistrationToken.token == token, RegistrationToken.used == False).first()
        if not db_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

        # Check if user already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")

        # Create user
        user = User(
            username=username,
            password_hash=get_password_hash(password),
            registration_token=token
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Mark token as used
        db_token.used = True
        db.commit()

        return {"message": "User registered successfully"}

    @router.post("/token")
    async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
        user = db.query(User).filter(User.username == form_data.username).first()
        if not user or not verify_password(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_jwt_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

    async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
            token_data = username
        except JWTError:
            raise credentials_exception
        user = db.query(User).filter(User.username == token_data).first()
        if user is None:
            raise credentials_exception
        return user

    async def get_current_active_user(current_user: User = Depends(get_current_user)):
        if not current_user.is_admin:
            raise HTTPException(status_code=400, detail="Inactive user")
        return current_user
    ```

4. **Integrate with FastAPI:**

    *Task Description:* Import and include the authentication router in the main FastAPI application (`backend/app/main.py`).  Also, set up the database connection.

    ```python
    # backend/app/main.py
    from fastapi import FastAPI, Depends
    from .auth.router import router as auth_router, get_current_active_user
    from .db import engine, Base # Assuming db.py for database setup
    from fastapi.middleware.cors import CORSMiddleware

    Base.metadata.create_all(bind=engine) # Create tables

    app = FastAPI()

    # CORS setup (adjust origins as needed)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://chat.seadragoninkmortal.com",
            "https://admin.seadragoninkmortal.com",
            "http://localhost:3000" # Allow local frontend development
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router)

    @app.get("/")
    async def root():
        return {"message": "Seadragon LLM Server"}

    @app.get("/users/me")
    async def read_users_me(current_user: User = Depends(get_current_active_user)):
        return current_user

    ```

5. **Database Connection (`backend/app/db.py`):**

    ```python
    # backend/app/db.py
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.ext.declarative import declarative_base

    SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"  # Replace with your database URL

    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    ```

6. **Admin Panel Integration:**

    *Task Description:* Modify the `Admin.tsx` component (and its subcomponents) to require authentication. This will involve adding a login form and using the JWT token to access protected API endpoints.  This builds upon the planning steps in `06_admin_panel.md`.

7. **Web Interface Authentication:**

    *Task Description:*  Integrate user authentication into the web interface (`05_web_interface.md`). This will involve using the `/register` and `/token` endpoints to allow users to register (with a valid registration token) and log in.

8. **API Key Authentication (for Custom Applications):**

    *Task Description:* Implement API key authentication for custom applications. This involves creating a database model for API keys, generating unique keys, and validating them in the API Gateway. This will be detailed further in `04_api_gateway.md`.