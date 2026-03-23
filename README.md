
# 📘 EBD Manager Pro

Sistema avançado e responsivo para gestão de Escola Bíblica Dominical (EBD) e Tesouraria, agora com backend próprio em Node.js e banco de dados PostgreSQL.

## 🚀 Guia de Instalação e Configuração

Este guia ajudará você a migrar do Supabase para um servidor próprio com PostgreSQL.

### 1. Pré-requisitos
- **Node.js** (v18 ou superior)
- **PostgreSQL** (v14 ou superior)
- **Git**

### 2. Instalação
```bash
# Clone o repositório
git clone [url-do-repositorio]
cd ebd-manager-pro

# Instale as dependências
npm install
```

### 3. Configuração do Banco de Dados (PostgreSQL)

Crie um banco de dados no seu PostgreSQL e execute o script SQL abaixo para criar toda a estrutura necessária.

No docker-compose deste projeto, o Postgres está configurado assim:

usuário: ebd_user
senha: ebd_password
banco: ebd_manager
Referência: docker-compose.yml

A DATABASE_URL correspondente é:
postgres://ebd_user:ebd_password@db:5432/ebd_manager

Se você quiser conectar do seu host Windows em vez de dentro do container, normalmente o host fica localhost:5432.

#### Script de Criação (Schema)
```sql
-- Habilitar suporte a UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Configurações da Igreja
CREATE TABLE IF NOT EXISTS church_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Minha EBD',
  pastor TEXT,
  secretary TEXT,
  superintendent TEXT,
  address TEXT,
  footer_text TEXT,
  logo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Perfis de Usuário (Sincronizado com Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('ADMIN', 'TEACHER')) DEFAULT 'TEACHER',
  allowed_modules TEXT[] DEFAULT '{EBD}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Membrezia
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
  join_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. EBD (Professores, Classes e Alunos)
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  teachers TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  birth_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Chamadas e Calendário
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  present_student_ids TEXT[] DEFAULT '{}',
  bible_count INTEGER DEFAULT 0,
  magazine_count INTEGER DEFAULT 0,
  visitor_count INTEGER DEFAULT 0,
  offering_amount DECIMAL(12,2) DEFAULT 0.00,
  lesson_theme TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  present_teacher_ids TEXT[] NOT NULL DEFAULT '{}',
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  theme TEXT NOT NULL,
  description TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tesouraria (Dízimos e Ofertas)
CREATE TABLE IF NOT EXISTS contribution_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tithe_payers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('PASTOR_OBREIRO', 'COOPERADOR_MEMBRO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tithes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payer_id UUID REFERENCES tithe_payers(id),
  type_id UUID REFERENCES contribution_types(id),
  amount DECIMAL(12,2) NOT NULL,
  month TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 7. Financeiro Geral (Entradas e Saídas)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 8. Regionais
CREATE TABLE IF NOT EXISTS regionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS regional_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  regional_id UUID REFERENCES regionals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  income_amount DECIMAL(12,2) DEFAULT 0,
  expense_amount DECIMAL(12,2) DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Dados Iniciais
INSERT INTO contribution_types (name) VALUES ('Dízimo'), ('Oferta'), ('Oferta Especial') ON CONFLICT (name) DO NOTHING;
```

### 4. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
# Conexão com o Banco de Dados Local/Próprio
DATABASE_URL=postgres://usuario:senha@localhost:5432/nome_do_banco

# Credenciais do Supabase (Apenas para Autenticação)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 5. Migração de Dados (Supabase -> Novo Postgres)

Para migrar seus dados existentes do Supabase para o seu novo banco de dados:

1. **Exportar do Supabase**:
   No painel do Supabase, vá em **SQL Editor** e execute:
   ```sql
   -- Exemplo para exportar alunos (repita para cada tabela)
   SELECT json_agg(t) FROM public.students t;
   ```
   Copie o JSON resultante.

2. **Importar no Novo Banco**:
   Você pode usar um script simples ou ferramentas como o DBeaver para importar os dados. Se preferir via SQL, você pode gerar comandos `INSERT` a partir do Supabase.

3. **Dica Pro (pg_dump)**:
   Se você tiver acesso direto à string de conexão do Supabase, use o `pg_dump`:
   ```bash
   pg_dump -h db.seu-projeto.supabase.co -U postgres -d postgres -t nome_da_tabela > tabela.sql
   psql -h localhost -U seu_usuario -d seu_banco -f tabela.sql
   ```

### 6. Executar o Projeto (Manual)
```bash
# Iniciar o servidor backend e frontend
npm run dev
```

### 7. Executar com Docker (Recomendado)

A maneira mais fácil de rodar o sistema completo (App + Banco de Dados) é usando Docker.

#### Passo 1: Configurar Variáveis
Certifique-se de que seu arquivo `.env` tem as chaves do Supabase:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

#### Passo 2: Subir os Containers
```bash
docker-compose up -d --build
```

Isso irá:
1. Criar um banco de dados PostgreSQL automaticamente.
2. Executar o script `init.sql` para criar todas as tabelas.
3. Compilar o frontend e iniciar o servidor Node.js na porta interna 3001.
4. Iniciar o **Nginx** como proxy reverso na porta 3000.
5. Disponibilizar o app em `http://localhost:3000`.

#### Comandos Úteis do Docker:
- **Ver logs**: `docker-compose logs -f app`
- **Parar tudo**: `docker-compose down`
- **Reiniciar banco (limpar dados)**: `docker-compose down -v`

---

## 🔐 Segurança
O sistema agora utiliza um servidor intermediário (Express) que gerencia as permissões. Certifique-se de que sua `DATABASE_URL` não esteja exposta publicamente.

---
*Desenvolvido com excelência técnica para o serviço ministerial.*
