#!/bin/bash
npx typeorm migration:create ./src/database/migrations/$1
