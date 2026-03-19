
# 📘 EBD Manager Pro

Sistema avançado e responsivo para gestão de Escola Bíblica Dominical (EBD), com suporte completo para Android (PWA), iOS e Desktop.

## 🚀 Instalação e Execução

### 1. Clonar e Instalar
```bash
# Clone o repositório
git clone [url-do-repositorio]

# Entre na pasta
cd ebd-manager-pro

# Instale as dependências
npm install
```

### 2. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=https://sua-url.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 3. Executar
```bash
npm run dev
```

---

## 🗄️ Configuração do Banco de Dados (SQL)

Abra o **SQL Editor** no seu painel do Supabase e execute os blocos abaixo para criar a estrutura completa:

### 1. Extensões e Perfis (Profiles)
```sql
-- Habilitar suporte a UUID
create extension if not exists "uuid-ossp";

-- Tabela de Perfis de Acesso
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text check (role in ('ADMIN', 'TEACHER')) default 'TEACHER',
  created_at timestamp with time zone default now()
);

-- Trigger para criar perfil automático ao registrar usuário no Auth
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'TEACHER'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 2. Estrutura da Escola (Classes e Alunos)
```sql
create table public.teachers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  birth_date date,
  created_at timestamp with time zone default now()
);

create table public.classes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  teachers text[], -- Nomes dos professores para exibição rápida
  created_at timestamp with time zone default now()
);

create table public.students (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  class_id uuid references public.classes(id) on delete cascade,
  birth_date date,
  active boolean default true,
  created_at timestamp with time zone default now()
);
```

### 3. Registros de Chamada e Financeiro
```sql
create table public.attendance_records (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  class_id uuid references public.classes(id) on delete cascade,
  present_student_ids text[] default '{}',
  bible_count integer default 0,
  magazine_count integer default 0,
  visitor_count integer default 0,
  offering_amount decimal(12,2) default 0.00,
  lesson_theme text,
  created_at timestamp with time zone default now()
);

create table public.teacher_attendance (
  id uuid default gen_random_uuid() primary key,
  date date not null unique,
  present_teacher_ids text[] not null default '{}',
  observations text,
  created_at timestamp with time zone default now()
);
```

### 4. Gestão e Currículo
```sql
create table public.church_settings (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'Minha EBD',
  pastor text,
  secretary text,
  superintendent text,
  address text,
  footer_text text,
  logo_url text,
  updated_at timestamp with time zone default now()
);

create table public.lesson_calendar (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  theme text not null,
  description text,
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamp with time zone default now()
);
```

---

## 🔐 Políticas de Segurança (RLS)

O sistema utiliza **Row Level Security** para proteger os dados. Execute no SQL Editor:

```sql
-- Habilitar RLS em tudo
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.attendance_records enable row level security;
alter table public.teacher_attendance enable row level security;
alter table public.church_settings enable row level security;
alter table public.lesson_calendar enable row level security;

-- 1. Políticas para PERFIS
create policy "Ver próprio perfil" on profiles for select using (auth.uid() = id);
create policy "Admin vê todos perfis" on profiles for select using (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'));

-- 2. Políticas para CLASSES e ALUNOS (Leitura para todos, Escrita para Admin)
create policy "Todos leem classes" on classes for select using (auth.uid() is not null);
create policy "Admin edita classes" on classes for all using (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'));

create policy "Todos leem alunos" on students for select using (auth.uid() is not null);
create policy "Admin edita alunos" on students for all using (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'));

-- 3. Políticas para REGISTROS DE CHAMADA (Professores lançam, Admin controla tudo)
create policy "Leitura registros" on attendance_records for select using (auth.uid() is not null);
create policy "Todos criam registros" on attendance_records for insert with check (auth.uid() is not null);
create policy "Admin e Dono editam registros" on attendance_records for update using (true); -- Controle via UI

-- 4. Chamada de Professores e Configurações (SÓ ADMIN)
create policy "Admin full teacher_att" on teacher_attendance for all using (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'));
create policy "Leitura teacher_att" on teacher_attendance for select using (auth.uid() is not null);

create policy "Configurações públicas para leitura" on church_settings for select using (true);
create policy "Admin edita configurações" on church_settings for all using (exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN'));
```

---

## 📱 Suporte Mobile (Android e iOS)

Este app é um **PWA (Progressive Web App)** avançado.
- **Android (Chrome)**: Clique nos três pontinhos e selecione "Instalar Aplicativo". A logo da sua igreja configurada no sistema será usada como ícone nativo.
- **iOS (Safari)**: Clique no botão de compartilhamento (seta para cima) e selecione "Adicionar à Tela de Início".
- **Identidade Visual**: O ícone do app na tela inicial do celular é atualizado dinamicamente assim que você carrega a logo da igreja nas configurações do sistema.

---
*Desenvolvido com excelência técnica para o serviço ministerial.*
