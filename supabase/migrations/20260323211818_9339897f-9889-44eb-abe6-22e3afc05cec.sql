UPDATE pipeline_stages SET position = position + 1 WHERE segment = 'b2b' AND position >= 6;
INSERT INTO pipeline_stages (name, segment, position, color, description)
VALUES ('Reunião Cancelada', 'b2b', 6, '#ef4444', 'Reunião cancelada pelo lead via Calendly');