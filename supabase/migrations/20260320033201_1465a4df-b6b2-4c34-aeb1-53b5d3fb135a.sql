
-- B2C: shift positions 2+ up by 1 to make room for "Wishlist Iniciada" at pos 2
UPDATE pipeline_stages SET position = position + 1 WHERE segment = 'b2c' AND position >= 2;

-- B2C: insert "Wishlist Iniciada" at position 2
INSERT INTO pipeline_stages (name, segment, position, color, description)
VALUES ('Wishlist Iniciada', 'b2c', 2, '#f59e0b', 'Cliente começou a adicionar itens à wishlist');

-- B2B: shift positions 3+ up by 1 to make room for "Wishlist Iniciada" at pos 3
UPDATE pipeline_stages SET position = position + 1 WHERE segment = 'b2b' AND position >= 3;

-- B2B: insert "Wishlist Iniciada" at position 3
INSERT INTO pipeline_stages (name, segment, position, color, description)
VALUES ('Wishlist Iniciada', 'b2b', 3, '#f59e0b', 'Cliente começou a adicionar itens à wishlist');

-- B2B: swap "Reunião Agendada" (now pos 7) to pos 6, and "Aguardando Orçamento" (now pos 6) to pos 7
-- After the shift above: Aguardando Orçamento = 6, Reunião Agendada = 7
-- We want: Reunião Agendada = 6, Aguardando Orçamento = 7
UPDATE pipeline_stages SET position = 6 WHERE id = '78b38240-d119-422c-afcb-12a32ffbedca';
UPDATE pipeline_stages SET position = 7 WHERE id = '31915620-6b6d-4b3d-891a-197f17603b3d';
