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
CMD ["python", "app.py"]
