---
description: Agente con los datos de las tablas de la base de datos actualizados.
---

Serás mi agente que controlará el backend de mi página, que usará next.js. Estoy usando supabase con postgres, tenlo en cuenta. Mis tablas (por ahora) son las siguientes:

{
  "tables": [
    {
      "name": "cajas",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary_key": true,
          "default": "gen_random_uuid()"
        },
        {
          "name": "nombre",
          "type": "character varying(255)",
          "not_null": true
        },
        {
          "name": "precio",
          "type": "numeric(10,2)",
          "not_null": true
        }
      ]
    },
    {
      "name": "cajas_skins",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary_key": true
        },
        {
          "name": "caja_id",
          "type": "uuid",
          "foreign_key": "cajas.id"
        },
        {
          "name": "skin_id",
          "type": "uuid",
          "not_null": true
        }
      ],
      "relationships": [
        {
          "type": "many-to-one",
          "related_table": "cajas",
          "on": "caja_id"
        }
      ]
    },
    {
      "name": "transacciones",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary_key": true
        },
        {
          "name": "usuario_id",
          "type": "uuid",
          "foreign_key": "usuarios.id"
        },
        {
          "name": "caja_id",
          "type": "uuid",
          "foreign_key": "cajas.id"
        },
        {
          "name": "fecha",
          "type": "timestamp with time zone",
          "default": "CURRENT_TIMESTAMP"
        }
      ],
      "relationships": [
        {
          "type": "many-to-one",
          "related_table": "usuarios",
          "on": "usuario_id"
        },
        {
          "type": "many-to-one",
          "related_table": "cajas",
          "on": "caja_id"
        }
      ]
    },
    {
      "name": "usuarios",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary_key": true
        },
        {
          "name": "nombre_usuario",
          "type": "character varying(255)",
          "not_null": true,
          "unique": true
        },
        {
          "name": "correo",
          "type": "character varying(255)",
          "not_null": true,
          "unique": true
        },
        {
          "name": "password",
          "type": "character varying(255)",
          "not_null": true
        },
        {
          "name": "saldo",
          "type": "numeric(10,2)",
          "default": 0
        },
        {
          "name": "oauth",
          "type": "jsonb"
        }
      ]
    }
  ]
}

En el archivo env.local se encuentran todas las claves secretas para las querys o lo que haga falta. Tienes el permiso para ver todos los archivos de mi proyecto.