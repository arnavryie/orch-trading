import os
import uuid
from datetime import datetime
from peewee import *
from config.paths import app_data_path

db_path = app_data_path("hkirat.db")
db = SqliteDatabase(db_path)

def generate_uuid():
    return str(uuid.uuid4())

class BaseModel(Model):
    class Meta:
        database = db

class Models(BaseModel):
    id = CharField(primary_key=True, default=generate_uuid)
    name = CharField(unique=True)
    openRoutermodelName = CharField()
    lighterApiKey = CharField()
    invocationCount = IntegerField(default=0)
    accountIndex = CharField(default="0")

class Invocations(BaseModel):
    id = CharField(primary_key=True, default=generate_uuid)
    modelId = ForeignKeyField(Models, backref='invocations', column_name='modelId')
    response = TextField()
    createdAt = DateTimeField(default=datetime.now)
    updatedAt = DateTimeField(default=datetime.now)

class ToolCalls(BaseModel):
    id = CharField(primary_key=True, default=generate_uuid)
    invocationId = ForeignKeyField(Invocations, backref='toolCalls', column_name='invocationId')
    toolCallType = CharField() # "CREATE_POSITION" or "CLOSE_POSITION"
    metadata = TextField()
    createdAt = DateTimeField(default=datetime.now)
    updatedAt = DateTimeField(default=datetime.now)

class PortfolioSize(BaseModel):
    id = CharField(primary_key=True, default=generate_uuid)
    modelId = ForeignKeyField(Models, backref='portfolioSize', column_name='modelId')
    netPortfolio = CharField()
    createdAt = DateTimeField(default=datetime.now)
    updatedAt = DateTimeField(default=datetime.now)

def init_db():
    db.connect()
    db.create_tables([Models, Invocations, ToolCalls, PortfolioSize], safe=True)
    
    # Pre-seed a default model if none exists (so the UI has something to show)
    if Models.select().count() == 0:
        Models.create(
            name="Indian Trader Agent",
            openRoutermodelName="gemini-flash",
            lighterApiKey="mock_key",
            invocationCount=0,
            accountIndex="1"
        )
