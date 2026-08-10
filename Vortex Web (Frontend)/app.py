# -*- coding: utf-8 -*-
from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

# Главная страница (Лендинг и вход)
# Добавьте эту строку в самое начало app.py (после импортов)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# И замените сам маршрут /:
@app.route('/')
def index():
    return send_from_directory(os.path.join(BASE_DIR, 'home', 'home'), 'home.html')

@app.route('/home/home/<path:filename>')
def home_style(filename):
    return send_from_directory('home/home', filename)

# Маршрут для menu.js
@app.route('/home/style/menu/<path:filename>')
def home_menu(filename):
    return send_from_directory('home/style/menu', filename)

# Маршрут для header.css
@app.route('/home/style/cap/<path:filename>')
def home_cap(filename):
    return send_from_directory('home/style/cap', filename)

# О нас стили
@app.route('/home/about/<path:filename>')
def home_about(filename):
    return send_from_directory('home/about', filename)

# О нас
@app.route('/about')
def about():
    return send_from_directory('home/about', 'about.html')

# Тарифы - статика
@app.route('/home/tariffs/<path:filename>')
def home_tariffs(filename):
    return send_from_directory('home/tariffs', filename)

# Тарифы - страница
@app.route('/tariffs')
def tariffs_page():
    return send_from_directory('home/tariffs', 'tariffs.html')

# Контакты - статика
@app.route('/home/contacts/<path:filename>')
def home_contacts(filename):
    return send_from_directory('home/contacts', filename)

# Контакты - страница
@app.route('/contacts')
def contacts_page():
    return send_from_directory('home/contacts', 'contacts.html')

# Вопросы - статика
@app.route('/home/questions/<path:filename>')
def home_questions(filename):
    return send_from_directory('home/questions', filename)

# Вопросы - страница
@app.route('/questions')
def questions_page():
    return send_from_directory('home/questions', 'questions.html')

# Поддержка - статика
@app.route('/home/support/<path:filename>')
def home_support(filename):
    return send_from_directory('home/support', filename)

# Поддержка - страница
@app.route('/support')
def support_page():
    return send_from_directory('home/support', 'support.html')

# Дистрибьютор - статика
@app.route('/home/distributor/<path:filename>')
def home_distributor(filename):
    return send_from_directory('home/distributor', filename)

# Дистрибьютор - страница
@app.route('/distributor')
def distributor():
    return send_from_directory('home/distributor', 'distributor.html')





@app.route('/calendar')
def calendar_page():
    return render_template('calendar.html')



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


# НОВОЕ: Страница регистрации компании
@app.route('/registration')
def registration():
    return render_template('registration.html')

# Главное окно CRM
# ДОБАВЬТЕ ЭТОТ МАРШРУТ
@app.route('/crm/dashboard/<path:filename>')
def serve_dashboard(filename):
    return send_from_directory('crm/dashboard', filename)

# ИЗМЕНИТЕ МАРШРУТ /dashboard
@app.route('/dashboard')
def dashboard():
    return send_from_directory('crm/dashboard', 'dashboard.html')

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
    # Отдаём HTML, но предварительно заменяем url_for на прямые пути
    import os
    file_path = os.path.join('static', 'employees', 'employees.html')
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Заменяем {{ url_for('static', filename=...) }} на прямые пути /static/...
    import re
    content = re.sub(
        r'\{\{\s*url_for\([\'"](?:static|employees)[\'"],\s*filename=[\'"]([^\'"]+)[\'"]\s*\)\s*\}\}',
        r'/static/\1',
        content
    )
    # Также заменяем ../static/ на /static/
    content = content.replace('"../static/', '"/static/')
    content = content.replace("'../static/", "'/static/")
    
    return content, 200, {'Content-Type': 'text/html'}

@app.route('/company')
def company():
    return send_from_directory('crm/company/page', 'company.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/Card.html')
def client_card():
    # Эта функция просто берет файл из папки templates и отдает браузеру
    return render_template('Card.html')

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ СТИЛЕЙ
@app.route('/styles/<path:filename>')
def serve_styles(filename):
    return send_from_directory('styles', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ КАПЕЛЬ (DROP)
@app.route('/drop/<path:filename>')
def serve_drop(filename):
    return send_from_directory('styles/drop', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ИНДИКАТОРОВ
@app.route('/crm/indicator/<path:filename>')
def serve_indicator(filename):
    return send_from_directory('crm/indicator', filename)

# МАРШРУТ ДЛЯ ПАПКИ SAMPLE ИНДИКАТОРОВ
@app.route('/crm/indicator/sample/<path:filename>')
def serve_indicator_sample(filename):
    return send_from_directory('crm/indicator/sample', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ КНОПКИ "НАЗАД" (BACK)
@app.route('/crm/indicator/back/<path:filename>')
def serve_indicator_back(filename):
    return send_from_directory('crm/indicator/back', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ СТРАНИЦЫ КОМПАНИИ
@app.route('/crm/company/page/<path:filename>')
def serve_company_page(filename):
    return send_from_directory('crm/company/page', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ВИДЕО
@app.route('/styles/background/video/<path:filename>')
def serve_background_video(filename):
    return send_from_directory('styles/background/video', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ РАЗДЕЛЕННОГО ПРЕДСТАВЛЕНИЯ (SEPARATION)
@app.route('/crm/company/window/separation/<path:filename>')
def serve_separation(filename):
    return send_from_directory('crm/company/window/separation', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ЛЕВОЙ ЧАСТИ (LEFT)
@app.route('/crm/company/left/<path:filename>')
def serve_company_left(filename):
    return send_from_directory('crm/company/left', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ТАРИФОВ
@app.route('/crm/indicator/rates/<path:filename>')
def serve_indicator_rates(filename):
    return send_from_directory('crm/indicator/rates', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ КАЛЕНДАРЯ
@app.route('/crm/indicator/calendar/<path:filename>')
def serve_indicator_calendar(filename):
    return send_from_directory('crm/indicator/calendar', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ TOOLS
@app.route('/crm/tools/<path:filename>')
def serve_tools(filename):
    return send_from_directory('crm/tools', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ИНСТРУМЕНТОВ КОМПАНИИ (TOOL)
@app.route('/crm/company/tool/<path:filename>')
def serve_company_tool(filename):
    return send_from_directory('crm/company/tool', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ИНДИКАТОРА "КОЛИЧЕСТВО СОТРУДНИКОВ"
@app.route('/crm/indicator/number%20of%20employees/<path:filename>')
def serve_indicator_employees_count(filename):
    return send_from_directory('crm/indicator/number of employees', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ИЗОБРАЖЕНИЙ
@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('images', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ИЗОБРАЖЕНИЙ КОМПАНИИ
@app.route('/crm/company/images/<path:filename>')
def serve_company_images(filename):
    return send_from_directory('crm/company/images', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ИНДИКАТОРА "В РАБОТЕ" (IN PROGRESS)
@app.route('/crm/indicator/in%20progress/<path:filename>')
def serve_indicator_in_progress(filename):
    return send_from_directory('crm/indicator/in progress', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ИНДИКАТОРА "ПРИБЫЛЬ ЗА МЕСЯЦ" (MONTHLY PROFIT)
@app.route('/crm/indicator/monthly%20profit/<path:filename>')
def serve_indicator_monthly_profit(filename):
    return send_from_directory('crm/indicator/monthly profit', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ИНДИКАТОРА "БЛИЖАЙШАЯ ЗАДАЧА" (IMMEDIATE TASK)
@app.route('/crm/indicator/immediate%20task/<path:filename>')
def serve_indicator_immediate_task(filename):
    return send_from_directory('crm/indicator/immediate task', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ УНИВЕРСАЛЬНЫХ КНОПОК
@app.route('/styles/button/buttons/<path:filename>')
def serve_buttons(filename):
    return send_from_directory('styles/button/buttons', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ ПРАВОЙ ЧАСТИ КОМПАНИИ (RIGHT/BUTTONS)
@app.route('/crm/company/right/buttons/<path:filename>')
def serve_company_right_buttons(filename):
    return send_from_directory('crm/company/right/buttons', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ МОДАЛЬНОГО ОКНА (НОВЫЙ ПУТЬ)
@app.route('/crm/company/window/modal/<path:filename>')
def serve_modal_window(filename):
    return send_from_directory('crm/company/window/modal', filename)

# СТАТИЧЕСКИЙ МАРШРУТ ДЛЯ РЕКВИЗИТОВ КОМПАНИИ
@app.route('/crm/company/requisite/<path:filename>')
def serve_company_requisite(filename):
    """Отдает статические файлы для модального окна реквизитов"""
    return send_from_directory('crm/company/requisite', filename)

# СТАТИЧЕСКИЕ ФАЙЛЫ ДЛЯ КОНТРАГЕНТОВ
@app.route('/crm/company/right/counterparty/<path:filename>')
def serve_company_counterparty(filename):
    return send_from_directory('crm/company/right/counterparty', filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)