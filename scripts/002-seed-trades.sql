-- Seed construction trades
INSERT INTO trades (name, category, description) VALUES
  ('General Contracting', 'General', 'Overall project management and coordination'),
  ('Electrical', 'MEP', 'Electrical wiring, fixtures, and systems'),
  ('Plumbing', 'MEP', 'Plumbing systems, pipes, and fixtures'),
  ('HVAC', 'MEP', 'Heating, ventilation, and air conditioning systems'),
  ('Concrete', 'Structural', 'Concrete foundations, slabs, and structures'),
  ('Framing', 'Structural', 'Wood and steel framing'),
  ('Roofing', 'Exterior', 'Roof installation and repairs'),
  ('Masonry', 'Exterior', 'Brick, block, and stone work'),
  ('Drywall', 'Interior', 'Drywall installation and finishing'),
  ('Painting', 'Interior', 'Interior and exterior painting'),
  ('Flooring', 'Interior', 'Tile, hardwood, carpet installation'),
  ('Carpentry', 'Interior', 'Finish carpentry and millwork'),
  ('Landscaping', 'Site Work', 'Landscaping and site improvements'),
  ('Demolition', 'Site Work', 'Demolition and site clearing'),
  ('Glass & Glazing', 'Exterior', 'Window and glass installation')
ON CONFLICT (name) DO NOTHING;
