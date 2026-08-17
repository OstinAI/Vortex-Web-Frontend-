# -*- coding: utf-8 -*-
from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Вспомогательная функция для безопасного формирования абсолютных путей
def get_path(*paths):
    return os.path.join(BASE_DIR, *paths)

# --- ГЛАВНАЯ И СТРАНИЦЫ HOME ---

@app.route('/')
def index():
    return send_from_directory(get_path('Home', 'home'), 'home.html')

@app.route('/home/home/<path:filename>')
def home_style(filename):
    return send_from_directory(get_path('Home', 'home'), filename)

@app.route('/home/style/menu/<path:filename>')
def home_menu(filename):
    return send_from_directory(get_path('Home', 'style', 'menu'), filename)

@app.route('/home/style/cap/<path:filename>')
def home_cap(filename):
    return send_from_directory(get_path('Home', 'style', 'cap'), filename)

# ✅ ДОБАВЛЯЕМ МАРШРУТ ДЛЯ REGISTRATION CSS И ДРУГИХ ФАЙЛОВ
@app.route('/home/registration/<path:filename>')
def home_registration_files(filename):
    return send_from_directory(get_path('Home', 'registration'), filename)

# ✅ ДОБАВЛЯЕМ МАРШРУТ ДЛЯ STYLE.CSS ИЗ REGISTRATION
@app.route('/home/registration/style.css')
def home_registration_style():
    return send_from_directory(get_path('Home', 'registration'), 'style.css')

# ✅ ДОБАВЛЯЕМ МАРШРУТ ДЛЯ REGISTRATION.CSS
@app.route('/home/registration/registration.css')
def home_registration_css():
    return send_from_directory(get_path('Home', 'registration'), 'registration.css')

# ✅ ДОБАВЛЯЕМ МАРШРУТ ДЛЯ REGISTRATION.JS
@app.route('/home/registration/registration.js')
def home_registration_js():
    return send_from_directory(get_path('Home', 'registration'), 'registration.js')

# ✅ ДОБАВЛЯЕМ МАРШРУТ ДЛЯ STYLE.CSS (ОСНОВНОЙ)
@app.route('/home/style.css')
def home_main_style():
    return send_from_directory(get_path('Home'), 'style.css')

@app.route('/home/about/<path:filename>')
def home_about(filename):
    return send_from_directory(get_path('Home', 'about'), filename)

@app.route('/about')
def about():
    return send_from_directory(get_path('Home', 'about'), 'about.html')

@app.route('/home/tariffs/<path:filename>')
def home_tariffs(filename):
    return send_from_directory(get_path('Home', 'tariffs'), filename)

@app.route('/tariffs')
def tariffs_page():
    return send_from_directory(get_path('Home', 'tariffs'), 'tariffs.html')

@app.route('/home/contacts/<path:filename>')
def home_contacts(filename):
    return send_from_directory(get_path('Home', 'contacts'), filename)

@app.route('/contacts')
def contacts_page():
    return send_from_directory(get_path('Home', 'contacts'), 'contacts.html')

@app.route('/home/questions/<path:filename>')
def home_questions(filename):
    return send_from_directory(get_path('Home', 'questions'), filename)

@app.route('/questions')
def questions_page():
    return send_from_directory(get_path('Home', 'questions'), 'questions.html')

@app.route('/home/support/<path:filename>')
def home_support(filename):
    return send_from_directory(get_path('Home', 'support'), filename)

@app.route('/support')
def support_page():
    return send_from_directory(get_path('Home', 'support'), 'support.html')

@app.route('/home/distributor/<path:filename>')
def home_distributor(filename):
    return send_from_directory(get_path('Home', 'distributor'), filename)

@app.route('/distributor')
def distributor():
    return send_from_directory(get_path('Home', 'distributor'), 'distributor.html')

# --- ОСТАЛЬНЫЕ РАЗДЕЛЫ И CRM ---

@app.route('/calendar')
def calendar_page():
    return render_template('calendar.html')

@app.after_request
def inject_vortex_favicon(response):
    if response.mimetype == 'text/html' and not response.direct_passthrough:
        try:
            html_content = response.get_data(as_text=True)
            if 'images/logo.png' not in html_content:
                favicon_code = '<link rel="icon" type="image/png" href="/static/images/logo.png">'
                if '</head>' in html_content:
                    html_content = html_content.replace('</head>', f'    {favicon_code}\n</head>', 1)
                elif '<body>' in html_content:
                    html_content = html_content.replace('<body>', f'<body>\n    {favicon_code}', 1)
                response.set_data(html_content)
        except Exception:
            pass
    return response

@app.route('/crm/dashboard/<path:filename>')
def serve_dashboard(filename):
    return send_from_directory(get_path('crm', 'dashboard'), filename)

@app.route('/dashboard')
def dashboard():
    return send_from_directory(get_path('crm', 'dashboard'), 'dashboard.html')

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
    file_path = get_path('static', 'employees', 'employees.html')
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    import re
    content = re.sub(
        r'\{\{\s*url_for\([\'"](?:static|employees)[\'"],\s*filename=[\'"]([^\'"]+)[\'"]\s*\)\s*\}\}',
        r'/static/\1',
        content
    )
    content = content.replace('"../static/', '"/static/')
    content = content.replace("'../static/", "'/static/")
    return content, 200, {'Content-Type': 'text/html'}

@app.route('/company')
def company():
    return send_from_directory(get_path('crm', 'company', 'page'), 'company.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/Card.html')
def client_card():
    return render_template('Card.html')

# --- СТАТИЧЕСКИЕ РЕСУРСЫ С АБСОЛЮТНЫМИ ПУТЯМИ ---

@app.route('/styles/<path:filename>')
def serve_styles(filename):
    return send_from_directory(get_path('styles'), filename)

@app.route('/drop/<path:filename>')
def serve_drop(filename):
    return send_from_directory(get_path('styles', 'drop'), filename)

@app.route('/crm/indicator/<path:filename>')
def serve_indicator(filename):
    return send_from_directory(get_path('crm', 'indicator'), filename)

@app.route('/crm/indicator/sample/<path:filename>')
def serve_indicator_sample(filename):
    return send_from_directory(get_path('crm', 'indicator', 'sample'), filename)

@app.route('/crm/indicator/back/<path:filename>')
def serve_indicator_back(filename):
    return send_from_directory(get_path('crm', 'indicator', 'back'), filename)

@app.route('/crm/company/page/<path:filename>')
def serve_company_page(filename):
    return send_from_directory(get_path('crm', 'company', 'page'), filename)

@app.route('/styles/background/video/<path:filename>')
def serve_background_video(filename):
    return send_from_directory(get_path('styles', 'background', 'video'), filename)

@app.route('/crm/company/window/separation/<path:filename>')
def serve_separation(filename):
    return send_from_directory(get_path('crm', 'company', 'window', 'separation'), filename)

@app.route('/crm/company/left/<path:filename>')
def serve_company_left(filename):
    return send_from_directory(get_path('crm', 'company', 'left'), filename)

@app.route('/crm/indicator/rates/<path:filename>')
def serve_indicator_rates(filename):
    return send_from_directory(get_path('crm', 'indicator', 'rates'), filename)

@app.route('/crm/indicator/calendar/<path:filename>')
def serve_indicator_calendar(filename):
    return send_from_directory(get_path('crm', 'indicator', 'calendar'), filename)

@app.route('/crm/tools/<path:filename>')
def serve_tools(filename):
    return send_from_directory(get_path('crm', 'tools'), filename)

@app.route('/crm/company/tool/<path:filename>')
def serve_company_tool(filename):
    return send_from_directory(get_path('crm', 'company', 'tool'), filename)

@app.route('/crm/indicator/number%20of%20employees/<path:filename>')
def serve_indicator_employees_count(filename):
    return send_from_directory(get_path('crm', 'indicator', 'number of employees'), filename)

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(get_path('images'), filename)

@app.route('/crm/company/images/<path:filename>')
def serve_company_images(filename):
    return send_from_directory(get_path('crm', 'company', 'images'), filename)

@app.route('/crm/indicator/in%20progress/<path:filename>')
def serve_indicator_in_progress(filename):
    return send_from_directory(get_path('crm', 'indicator', 'in progress'), filename)

@app.route('/crm/indicator/monthly%20profit/<path:filename>')
def serve_indicator_monthly_profit(filename):
    return send_from_directory(get_path('crm', 'indicator', 'monthly profit'), filename)

@app.route('/crm/indicator/immediate%20task/<path:filename>')
def serve_indicator_immediate_task(filename):
    return send_from_directory(get_path('crm', 'indicator', 'immediate task'), filename)

@app.route('/styles/button/buttons/<path:filename>')
def serve_buttons(filename):
    return send_from_directory(get_path('styles', 'button', 'buttons'), filename)

@app.route('/crm/company/right/buttons/<path:filename>')
def serve_company_right_buttons(filename):
    return send_from_directory(get_path('crm', 'company', 'right', 'buttons'), filename)

@app.route('/crm/company/window/modal/<path:filename>')
def serve_modal_window(filename):
    return send_from_directory(get_path('crm', 'company', 'window', 'modal'), filename)

@app.route('/crm/company/requisite/<path:filename>')
def serve_company_requisite(filename):
    return send_from_directory(get_path('crm', 'company', 'requisite'), filename)

@app.route('/crm/company/right/counterparty/<path:filename>')
def serve_company_counterparty(filename):
    return send_from_directory(get_path('crm', 'company', 'right', 'counterparty'), filename)

@app.route('/crm/company/right/distributor/distributor.css')
def distributor_css():
    return send_from_directory(
        get_path('crm', 'company', 'right', 'distributor'),
        'distributor.css'
    )

@app.route('/crm/company/right/distributor/distributor.js')
def distributor_js():
    return send_from_directory(
        get_path('crm', 'company', 'right', 'distributor'),
        'distributor.js'
    )

@app.route('/crm/company/right/List_of_companies/<path:filename>')
def list_of_companies_files(filename):
    return send_from_directory(
        get_path('crm', 'company', 'right', 'List_of_companies'),
        filename
    )

@app.route('/crm/company/right/cabinet/<path:filename>')
def serve_cabinet(filename):
    return send_from_directory(
        get_path('crm', 'company', 'right', 'cabinet'),
        filename
    )

# ============================================
# РЕГИСТРАЦИЯ
# ============================================

@app.route('/registration')
def registration():
    """Страница регистрации компании"""
    return send_from_directory(
        get_path('home', 'registration'),
        'registration.html'
    )

# ✅ ЭТИ МАРШРУТЫ УЖЕ ДОБАВЛЕНЫ ВЫШЕ
# @app.route('/home/registration/registration.css')
# @app.route('/home/registration/registration.js')
# @app.route('/home/registration/<path:filename>')


# ==========================================
# РОУТ ДЛЯ ВИДЕОФОНА 
# ==========================================
@app.route('/video-bg.html')
def video_bg():
    """Отдает фоновое видео (загружается 1 раз)"""
    return send_from_directory('Home/style/video', 'video-bg.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)  # debug=True для локальной разработки