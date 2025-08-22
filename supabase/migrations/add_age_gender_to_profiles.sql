-- Añadir columnas de edad y género a la tabla profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;

-- Crear políticas para estas columnas
CREATE POLICY "Users can read any profile age and gender" 
  ON profiles
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own age and gender" 
  ON profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);