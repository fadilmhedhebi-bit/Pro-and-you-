#!/bin/bash
set -e

echo ""
echo "  Pro and You - Demarrage"
echo "  ================================="
echo ""

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "PostgreSQL n'est pas installe. Installez-le avant de continuer."
  exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "Node.js n'est pas installe. Installez-le avant de continuer."
  exit 1
fi

# Create .env from example if missing
if [ ! -f server/.env ]; then
  echo "Creation de server/.env depuis .env.example..."
  cp server/.env.example server/.env
fi

# Source env for DB creation
export $(grep -v '^#' server/.env | xargs)

# Extract DB name from DATABASE_URL
DB_NAME=$(echo "$DATABASE_URL" | sed 's|.*/||')

# Create database if it doesn't exist
if ! psql "$DATABASE_URL" -c '\q' 2>/dev/null; then
  echo "Creation de la base de donnees '$DB_NAME'..."
  createdb "$DB_NAME" 2>/dev/null || true
fi

# Install dependencies
echo "Installation des dependances..."
npm run install:all

# Initialize schema
echo "Initialisation du schema..."
npm run db:init

# Seed demo data
echo "Insertion des donnees de demonstration..."
npm run db:seed

# Start dev servers
echo ""
echo "Demarrage des serveurs de developpement..."
echo "  Backend  : http://localhost:3001"
echo "  Frontend : http://localhost:5173"
echo ""
npm run dev
