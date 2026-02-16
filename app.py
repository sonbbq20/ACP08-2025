from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
# เปิดใช้งาน CORS เพื่อให้หน้าเว็บ HTML เรียกใช้ API นี้ได้
CORS(app)

# ตั้งค่าการเชื่อมต่อฐานข้อมูล (ต้องตรงกับ XAMPP)
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',       # XAMPP ปกติจะไม่มีรหัสผ่าน
    'database': 'car_project',
    'charset': 'utf8mb4'  # รองรับภาษาไทย
}

@app.route('/api/search', methods=['GET'])
def search_cars():
    search_term = request.args.get('search', '')
    
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # SQL Query: ค้นหาจาก ยี่ห้อ, รุ่น หรือ คำผสม (เช่น "Tesla Model 3")
        sql = """
            SELECT * FROM cars 
            WHERE CONCAT(make, ' ', model) LIKE %s 
            OR make LIKE %s 
            OR model LIKE %s
        """
        wildcard = f"%{search_term}%"
        val = (wildcard, wildcard, wildcard)
        
        cursor.execute(sql, val)
        results = cursor.fetchall()
        
        conn.close()
        return jsonify(results)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # รันเซิร์ฟเวอร์ที่ Port 5000
    print("🚀 Server starting on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)