from sqlalchemy import BigInteger, Column, Text, Boolean, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

class Especie(Base):
    __tablename__ = "especies"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nombre_común = Column(Text)
    scientific_name = Column(Text, nullable=False)
    habitat = Column(Text)
    estado_conservación = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    nombres_comunes = Column(Text)
    tipo_morfología = Column(Text)
    expectativa_vida = Column(Text)
    slug = Column(Text, unique=True, nullable=False)
    tipo_planta = Column(Text)
    distribución = Column(Text)
    floración = Column(Text)
    cuidado = Column(Text)
    usos = Column(Text)
    historia_y_leyendas = Column(Text)
    historia_nombre = Column(Text)
    Endémica = Column(Boolean)
