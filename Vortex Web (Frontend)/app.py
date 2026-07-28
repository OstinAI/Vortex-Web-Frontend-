# -*- coding: utf-8 -*-
from flask import Flask, render_template, send_from_directory

app = Flask(__name__)


@app.route('/calendar')
def calendar_page():
    return render_template('calendar.html')

# 🚀 ДОБАВЬ ЭТОТ КЛАССИЧЕСКИЙ РОУТ ДЛЯ СТРАНИЦЫ ТАРИФОВ
@app.route('/tariffs')
def tariffs_page():
    return send_from_directory('static/js/style/tariffs', 'tariffs.html')

@app.route('/contacts')
def contacts_page():
    return send_from_directory('static/js/style/contacts', 'contacts.html')

@app.route('/questions')
def questions_page():
    return send_from_directory('static/js/style/questions', 'questions.html')

@app.route('/support')
def support_page():
    return send_from_directory('static/js/style/support', 'support.html')

@app.route('/about')
def about():
    return send_from_directory('static/js/style/about', 'about.html')

# Фавикон - исправлен для работы со статическими файлами
@app.after_request
def inject_vortex_favicon(response):
    # Проверяем, что это HTML и не статический файл
    if response.mimetype == 'text/html' and not response.direct_passthrough:
        try:
            html_content = response.get_data(as_text=True)
            
            # Если фавикона еще нет в коде страницы, вклеиваем его
            if 'images/logo.png' not in html_content:
                favicon_code = '<link rel="icon" type="image/png" href="/static/images/logo.png">'
                
                if '</head>' in html_content:
                    html_content = html_content.replace('</head>', f'    {favicon_code}\n</head>', 1)
                elif '<body>' in html_content:
                    html_content = html_content.replace('<body>', f'<body>\n    {favicon_code}', 1)
                    
                response.set_data(html_content)
        except Exception:
            # Если ошибка - просто пропускаем
            pass
            
    return response

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