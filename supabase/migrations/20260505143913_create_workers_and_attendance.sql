/*
  # Create Workers and Attendance Tables

  1. New Tables
    - `workers`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `phone` (text)
      - `address` (text)
      - `photo_url` (text) - URL to uploaded photo for face recognition
      - `created_at` (timestamptz)

    - `attendance`
      - `id` (uuid, primary key)
      - `worker_id` (uuid, foreign key -> workers.id)
      - `date` (date, not null)
      - `time_in` (time)
      - `status` (text: 'present' | 'absent')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage data

  3. Notes
    - attendance.date + worker_id combo should be unique per day
    - status defaults to 'present' when a record is created via attendance marking
*/

CREATE TABLE IF NOT EXISTS workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  address text DEFAULT '',
  photo_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workers"
  ON workers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert workers"
  ON workers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update workers"
  ON workers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete workers"
  ON workers FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time_in time DEFAULT CURRENT_TIME,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(worker_id, date)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_id ON attendance(worker_id);
