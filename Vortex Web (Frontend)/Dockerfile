# Используем легкий образ Python
FROM python:3.10-slim

# Указываем рабочую директорию
WORKDIR /app

# Копируем файл зависимостей и устанавливаем их
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь остальной код
COPY . .

# Cloud Run слушает порт 8080 по умолчанию
ENV PORT 8080
EXPOSE 8080

# Запуск приложения
CMD ["python", "app.py"]
