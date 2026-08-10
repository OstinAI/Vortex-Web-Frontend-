FROM python:3.10-slim
WORKDIR /app
# Устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Копируем остальной код
COPY . .
# Пробрасываем порт для Cloud Run
ENV PORT 8080
EXPOSE 8080
# Запуск твоего файла
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 0 app:app
