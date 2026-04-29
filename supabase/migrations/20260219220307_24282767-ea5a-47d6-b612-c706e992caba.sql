
-- =============================================
-- 1. Enum para papéis de usuário
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- =============================================
-- 2. Tabela user_roles
-- =============================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. Função has_role (SECURITY DEFINER)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =============================================
-- 4. Políticas RLS para user_roles
-- =============================================
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. Tabela quote_requests
-- =============================================
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  user_email text,
  user_phone text,
  items jsonb,
  answers jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
  language text DEFAULT 'pt',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. Políticas RLS para quote_requests
-- =============================================

-- Usuários autenticados podem inserir suas próprias solicitações
CREATE POLICY "Users can insert own quote requests"
  ON public.quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Usuários não autenticados também podem inserir (wishlist sem login)
CREATE POLICY "Anon can insert quote requests"
  ON public.quote_requests FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Admins podem ver todos os orçamentos
CREATE POLICY "Admins can view all quote requests"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Usuários podem ver seus próprios orçamentos
CREATE POLICY "Users can view own quote requests"
  ON public.quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins podem atualizar status
CREATE POLICY "Admins can update quote requests"
  ON public.quote_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 7. Política RLS para admins verem todos os profiles
-- =============================================
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR is_own_profile(id));

-- =============================================
-- 8. Inserir os dois administradores
-- =============================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email IN ('linaheimpel.contato@gmail.com', 'joao.accioly95@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
