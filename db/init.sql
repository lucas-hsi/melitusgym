-- HealthTrack Pro Database Initialization
-- This script creates the initial database structure

-- Create database if not exists (handled by docker-compose)
-- CREATE DATABASE IF NOT EXISTS healthtrack;

-- Use the database
\c healthtrack;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE log_type AS ENUM ('glucose', 'blood_pressure', 'insulin', 'weight');
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE workout_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE alarm_type AS ENUM ('medication', 'glucose_check', 'meal', 'workout');
CREATE TYPE alarm_status AS ENUM ('active', 'snoozed', 'dismissed', 'completed');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    date_of_birth DATE,
    height_cm INTEGER,
    target_weight_kg DECIMAL(5,2),
    diabetes_type VARCHAR(50),
    diagnosis_date DATE,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clinical logs table
CREATE TABLE clinical_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_type log_type NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    systolic INTEGER, -- Para pressão arterial
    diastolic INTEGER, -- Para pressão arterial
    notes TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Meals table
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_type meal_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    photo_url VARCHAR(500),
    total_calories DECIMAL(8,2),
    total_carbs DECIMAL(8,2),
    total_protein DECIMAL(8,2),
    total_fat DECIMAL(8,2),
    glycemic_impact VARCHAR(20), -- low, medium, high
    nutritionix_data JSONB, -- Dados da API Nutritionix
    consumed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recipes table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ingredients JSONB NOT NULL, -- Array de ingredientes
    instructions JSONB NOT NULL, -- Array de passos
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER DEFAULT 1,
    calories_per_serving DECIMAL(8,2),
    carbs_per_serving DECIMAL(8,2),
    protein_per_serving DECIMAL(8,2),
    fat_per_serving DECIMAL(8,2),
    glycemic_impact VARCHAR(20),
    tags JSONB, -- Array de tags
    photo_url VARCHAR(500),
    is_therapeutic BOOLEAN DEFAULT false,
    diabetes_friendly BOOLEAN DEFAULT false,
    hypertension_friendly BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workouts table (exercícios base)
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    muscle_groups JSONB NOT NULL, -- Array de grupos musculares
    equipment JSONB, -- Array de equipamentos necessários
    difficulty workout_difficulty NOT NULL,
    instructions JSONB NOT NULL, -- Array de instruções
    video_url VARCHAR(500),
    image_url VARCHAR(500),
    musclewiki_id VARCHAR(100), -- ID da API MuscleWiki
    musclewiki_data JSONB, -- Dados da API MuscleWiki
    calories_per_minute DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User workouts table (treinos realizados)
CREATE TABLE user_workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES workouts(id),
    sets INTEGER,
    reps INTEGER,
    weight_kg DECIMAL(6,2),
    duration_minutes INTEGER,
    calories_burned DECIMAL(8,2),
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alarms table
CREATE TABLE alarms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    alarm_type alarm_type NOT NULL,
    scheduled_time TIME NOT NULL,
    days_of_week JSONB, -- Array de dias da semana [0-6]
    is_recurring BOOLEAN DEFAULT false,
    status alarm_status DEFAULT 'active',
    medication_name VARCHAR(255), -- Para alarmes de medicação
    dosage VARCHAR(100), -- Para alarmes de medicação
    snooze_count INTEGER DEFAULT 0,
    last_triggered TIMESTAMP WITH TIME ZONE,
    next_trigger TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_clinical_logs_user_id ON clinical_logs(user_id);
CREATE INDEX idx_clinical_logs_type ON clinical_logs(log_type);
CREATE INDEX idx_clinical_logs_logged_at ON clinical_logs(logged_at);
CREATE INDEX idx_meals_user_id ON meals(user_id);
CREATE INDEX idx_meals_consumed_at ON meals(consumed_at);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_workouts_muscle_groups ON workouts USING GIN(muscle_groups);
CREATE INDEX idx_user_workouts_user_id ON user_workouts(user_id);
CREATE INDEX idx_user_workouts_completed_at ON user_workouts(completed_at);
CREATE INDEX idx_alarms_user_id ON alarms(user_id);
CREATE INDEX idx_alarms_next_trigger ON alarms(next_trigger);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alarms_updated_at BEFORE UPDATE ON alarms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development
INSERT INTO users (email, username, full_name, hashed_password, diabetes_type, diagnosis_date) VALUES
('admin@healthtrack.com', 'admin', 'Administrador', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJflLxQjO', 'type_1', '2020-01-01'),
('user@healthtrack.com', 'testuser', 'Usuário Teste', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJflLxQjO', 'type_1', '2021-06-15');

-- Insert sample recipes
INSERT INTO recipes (name, description, ingredients, instructions, prep_time_minutes, cook_time_minutes, servings, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, glycemic_impact, tags, is_therapeutic, diabetes_friendly, hypertension_friendly) VALUES
('Salada de Quinoa com Vegetais', 'Salada nutritiva e baixa em carboidratos', 
 '["1 xícara de quinoa", "2 tomates", "1 pepino", "1/2 cebola roxa", "Azeite extra virgem", "Limão", "Sal e pimenta"]',
 '["Cozinhe a quinoa", "Corte os vegetais", "Misture tudo", "Tempere com azeite e limão"]',
 15, 15, 4, 180, 25, 8, 6, 'low', '["vegetariano", "sem glúten", "baixo carboidrato"]', true, true, true),
('Salmão Grelhado com Brócolis', 'Prato rico em ômega-3 e baixo em carboidratos',
 '["200g de salmão", "1 maço de brócolis", "Azeite", "Alho", "Limão", "Ervas finas"]',
 '["Tempere o salmão", "Grelhe por 4 min cada lado", "Refogue o brócolis", "Sirva com limão"]',
 10, 15, 2, 320, 8, 35, 18, 'low', '["rico em proteína", "ômega-3", "baixo carboidrato"]', true, true, true);

-- Insert sample workouts
INSERT INTO workouts (name, description, muscle_groups, equipment, difficulty, instructions, calories_per_minute) VALUES
('Flexão de Braço', 'Exercício básico para peito, ombros e tríceps',
 '["peito", "ombros", "tríceps"]', '["peso corporal"]', 'beginner',
 '["Posição de prancha", "Desça o corpo", "Empurre para cima", "Repita"]', 8.5),
('Agachamento Livre', 'Exercício fundamental para pernas e glúteos',
 '["quadríceps", "glúteos", "isquiotibiais"]', '["peso corporal"]', 'beginner',
 '["Pés na largura dos ombros", "Desça como se fosse sentar", "Suba controladamente", "Repita"]', 10.2),
('Prancha', 'Exercício isométrico para core',
 '["abdômen", "core", "ombros"]', '["peso corporal"]', 'beginner',
 '["Posição de flexão", "Apoie nos antebraços", "Mantenha o corpo reto", "Segure a posição"]', 6.8);

-- Insert sample alarms
INSERT INTO alarms (user_id, title, description, alarm_type, scheduled_time, days_of_week, is_recurring, medication_name, dosage) VALUES
((SELECT id FROM users WHERE username = 'testuser'), 'Insulina Matinal', 'Aplicar insulina antes do café da manhã', 'medication', '07:30:00', '[1,2,3,4,5,6,7]', true, 'Insulina Rápida', '10 UI'),
((SELECT id FROM users WHERE username = 'testuser'), 'Verificar Glicemia', 'Medir glicemia antes do almoço', 'glucose_check', '11:30:00', '[1,2,3,4,5,6,7]', true, null, null),
((SELECT id FROM users WHERE username = 'testuser'), 'Treino da Tarde', 'Hora do treino de força', 'workout', '17:00:00', '[2,4,6]', true, null, null);

COMMIT;