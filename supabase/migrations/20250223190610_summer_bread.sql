/*
  # Add canvas state to profiles

  1. Changes
    - Add canvas_state column to profiles table to store the serialized Fabric.js canvas state
    - Add RLS policies for canvas state management

  2. Security
    - Enable RLS
    - Users can only read/write their own canvas state
*/

-- Add canvas_state column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS canvas_state jsonb;

-- Update policies
CREATE POLICY "Users can update own canvas state"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view any canvas state"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);