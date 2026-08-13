# Database

SQLite is created automatically at `data/pm.db` (or `DATABASE_URL`). `users` supports multiple users, while `boards.user_id` is unique so each user owns one board. The board is stored as validated JSON containing fixed, renameable columns and cards. `chat_messages` stores compact AI conversation history per board.
