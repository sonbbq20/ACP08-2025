<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "car_project";

// สร้างการเชื่อมต่อ
$conn = new mysqli($servername, $username, $password, $dbname);

// ตั้งค่าภาษาไทย
$conn->set_charset("utf8mb4");

// เช็คการเชื่อมต่อ
if ($conn->connect_error) {
    echo json_encode(["error" => "Connection failed: " . $conn->connect_error]);
    exit();
}

// รับค่าค้นหา
$search = isset($_GET['search']) ? $_GET['search'] : '';
$search = $conn->real_escape_string($search);

// Query ข้อมูล (ค้นหาจาก ยี่ห้อ หรือ รุ่น)
$sql = "SELECT * FROM cars WHERE make LIKE '%$search%' OR model LIKE '%$search%'";
$result = $conn->query($sql);

$cars = array();

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $cars[] = array(
            "make" => $row["make"],
            "model" => $row["model"],
            "year" => (int)$row["year"],
            "price" => (float)$row["price"],
            "fuel" => $row["fuel"],
            "efficiency" => (float)$row["efficiency"],
            "tank_size" => (float)$row["tank_size"],
            "hp" => (int)$row["hp"],
            "acc_0_100" => (float)$row["acc_0_100"],
            "type" => $row["car_type"]
        );
    }
}

// ส่งค่ากลับเป็น JSON
echo json_encode($cars);

$conn->close();
?>