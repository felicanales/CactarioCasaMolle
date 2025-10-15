from sqlalchemy import BigInteger, Column, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

class Sector(Base):
    __tablename__ = "sectores"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    description = Column(Text)
    location = Column(Text)
    qr_code = Column(Text, unique=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
