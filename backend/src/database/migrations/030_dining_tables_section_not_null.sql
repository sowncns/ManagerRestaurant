-- 030: Bàn phải thuộc khu vực. Bỏ branch_id thừa (suy ra qua section).
BEGIN;

-- Gán bàn chưa có section vào section mặc định của branch đó
INSERT INTO branch_sections (branch_id, name, section_type, status)
SELECT DISTINCT dt.branch_id, 'Mặc định', 'area', 'active'
FROM dining_tables dt
WHERE dt.section_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM branch_sections bs
    WHERE bs.branch_id = dt.branch_id AND bs.name = 'Mặc định'
  );

UPDATE dining_tables dt
SET section_id = bs.section_id
FROM branch_sections bs
WHERE dt.section_id IS NULL
  AND bs.branch_id = dt.branch_id
  AND bs.name = 'Mặc định';

ALTER TABLE dining_tables ALTER COLUMN section_id SET NOT NULL;

COMMIT;
