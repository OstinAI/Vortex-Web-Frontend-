# -*- coding: utf-8 -*-
from flask import Flask, render_template

app = Flask(__name__)

# Главная страница (Лендинг и вход)
@app.route('/')
def index():
    return render_template('index.html')

# НОВОЕ: Страница регистрации компании
@app.route('/registration')
def registration():
    return render_template('registration.html')

# Главное окно CRM
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/stats')
def stats():
    return render_template('stats.html')

@app.route('/tasks')
def tasks():
    return render_template('tasks.html')

@app.route('/warehouse')
def warehouse():
    return render_template('warehouse.html')

@app.route('/crm')
def crm():
    return render_template('crm.html')

@app.route('/contact')
def contact_center():
    return render_template('contact.html')

@app.route('/employees')
def employees():
    return render_template('employees.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/Card.html')
def client_card():
    # Эта функция просто берет файл из папки templates и отдает браузеру
    return render_template('Card.html')

if __name__ == '__main__':
    # Запуск на порту 8080
    app.run(debug=True, host='0.0.0.0', port=8080)