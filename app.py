from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
# อนุญาตให้ทุกเว็บดึงข้อมูลได้ ป้องกันปัญหา CORS
CORS(app)

# ==========================================
# 1. ตั้งค่าฐานข้อมูล TiDB (อย่าลืมใส่ User/Pass ของคุณ)
# ==========================================
db_config = {
    'host': 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com', 
    'port': 4000,
    'user': '3KF3669S1D6aNc6.root',
    'password': 'UkJ0po4z1bURZQ00',
    'database': 'test',
    'charset': 'utf8mb4',
    'ssl_verify_cert': True,    # ⚠️ บังคับสำหรับ TiDB
    'ssl_verify_identity': True # ⚠️ บังคับสำหรับ TiDB
}

# ==========================================
# 2. หน้าทดสอบระบบ (เช็คว่า Render ทำงานไหม)
# ==========================================
@app.route('/')
def home():
    return "🚀 CarWise API is running online!"

# ==========================================
# 3. ระบบค้นหารถ
# ==========================================
@app.route('/api/search', methods=['GET'])
def search_car():
    try:
        search_query = request.args.get('search', '')
        
        # ลองเชื่อมต่อฐานข้อมูล
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        query = "SELECT * FROM cars WHERE brand LIKE %s OR model LIKE %s"
        like_query = f"%{search_query}%"
        cursor.execute(query, (like_query, like_query))
        
        results = cursor.fetchall()
        
        # แปลงข้อมูล Decimal เป็น Float เพื่อไม่ให้ JSON พัง (แก้ Error 500)
        for row in results:
            row['price'] = float(row['price']) if row['price'] is not None else 0
            row['efficiency'] = float(row['efficiency']) if row['efficiency'] is not None else 0
            row['tank_size'] = float(row['tank_size']) if row['tank_size'] is not None else 0
            row['acc_0_100'] = float(row['acc_0_100']) if row['acc_0_100'] is not None else 0
            
            # จัดการชื่อคอลัมน์ให้ตรงกับที่ JavaScript รอรับ
            if 'car_type' in row:
                row['type'] = row['car_type']
                
        cursor.close()
        conn.close()
        
        return jsonify(results)
        
    except Exception as e:
        # 🚨 จุดสำคัญ: ถ้ามีอะไรพัง มันจะส่ง Error กลับไปให้หน้าเว็บเห็นชัดๆ
        error_msg = f"Backend Error: {str(e)}"
        print(error_msg) # ปริ้นท์ลง Logs ของ Render
        return jsonify({"error": error_msg}), 500

if __name__ == '__main__':
    app.run(debug=True)