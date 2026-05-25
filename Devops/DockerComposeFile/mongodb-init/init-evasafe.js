// MongoDB Initialization Script
// This script runs when MongoDB starts for the first time

// Use console.log for environments that don't support print()
if (typeof print === 'undefined') {
  var print = console.log;
}

print('Starting EvaSafe database initialization...');

// Switch to the evasafe database
db = db.getSiblingDB('evasafe_prod');

// Create application user
db.createUser({
  user: 'evasafe_user',
  pwd: 'evasafe_password_2026',
  roles: [
    {
      role: 'readWrite',
      db: 'evasafe_prod'
    }
  ]
});

// Create collections with initial schema validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'email', 'password', 'role'],
      properties: {
        username: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'must be a valid email address'
        },
        role: {
          enum: ['admin', 'operator', 'viewer', 'police'],
          description: 'must be one of the enum values'
        }
      }
    }
  }
});

db.createCollection('incidents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['type', 'location', 'timestamp', 'status'],
      properties: {
        type: {
          enum: ['theft', 'violence', 'suspicious_activity', 'fire', 'intrusion', 'other'],
          description: 'must be one of the predefined incident types'
        },
        status: {
          enum: ['detected', 'reviewing', 'confirmed', 'false_positive', 'resolved'],
          description: 'must be one of the predefined status values'
        },
        confidence: {
          bsonType: 'number',
          minimum: 0,
          maximum: 1,
          description: 'confidence level between 0 and 1'
        }
      }
    }
  }
});

db.createCollection('cameras');
db.createCollection('alerts');
db.createCollection('evidence');
db.createCollection('users_sessions');

// Create indexes for performance
db.incidents.createIndex({ 'timestamp': -1 });
db.incidents.createIndex({ 'location': '2dsphere' });
db.incidents.createIndex({ 'type': 1, 'status': 1 });

db.alerts.createIndex({ 'timestamp': -1 });
db.alerts.createIndex({ 'incident_id': 1 });

db.cameras.createIndex({ 'location': '2dsphere' });
db.cameras.createIndex({ 'status': 1 });

db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'username': 1 }, { unique: true });

db.evidence.createIndex({ 'incident_id': 1 });
db.evidence.createIndex({ 'timestamp': -1 });

// Insert default admin user
db.users.insertOne({
  username: 'admin',
  email: 'admin@evasafe.com',
  password: '$2b$10$placeholder_hash_replace_with_actual',
  role: 'admin',
  created_at: new Date(),
  last_login: null,
  is_active: true,
  permissions: [
    'read:all',
    'write:all',
    'delete:all',
    'manage:users',
    'manage:cameras',
    'manage:alerts'
  ]
});

// Insert sample camera configurations
db.cameras.insertMany([
  {
    name: 'Camera 1 - Main Entrance',
    location: {
      type: 'Point',
      coordinates: [-74.006, 40.7128] // NYC coordinates as example
    },
    ip_address: '192.168.1.101',
    status: 'active',
    stream_url: 'rtsp://192.168.1.101:554/stream1',
    resolution: '1920x1080',
    fps: 30,
    created_at: new Date(),
    last_seen: new Date()
  },
  {
    name: 'Camera 2 - Parking Lot',
    location: {
      type: 'Point',
      coordinates: [-74.007, 40.7129]
    },
    ip_address: '192.168.1.102',
    status: 'active',
    stream_url: 'rtsp://192.168.1.102:554/stream1',
    resolution: '1920x1080',
    fps: 30,
    created_at: new Date(),
    last_seen: new Date()
  }
]);

print('EvaSafe database initialization completed successfully!');