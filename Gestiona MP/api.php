<?php
header("Content-Type: application/json");
try {
    $pdo = new PDO("mysql:host=localhost;dbname=inventario;charset=utf8", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    exit;
}
$action = $_GET["action"] ?? "";
$data = json_decode(file_get_contents("php://input"), true);
/*Listar productos de manera ordenada de acuerdo a su ID*/
if ($action === "list") {
    $sql = $pdo->query("SELECT * FROM productos ORDER BY id_producto ASC");
    echo json_encode($sql->fetchAll(PDO::FETCH_ASSOC));
    exit;
}
/* Buscar productos de materia prima por nombre y tipo  */
if ($action === "search") {
    $tipo   = $_GET["tipo"]   ?? "";
    $nombre = $_GET["nombre"] ?? "";
    // consulta base
    $query = "SELECT * FROM productos WHERE 1";
    // parámetros dinámicos
    $params = [];
    if ($tipo !== "") {
        $query .= " AND tipo = :tipo";
        $params[":tipo"] = $tipo;
    }
    if ($nombre !== "") {
        $query .= " AND nombre LIKE :nombre";
        $params[":nombre"] = "%".$nombre."%";
    }
    // preparar y ejecutar
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}
/* Este apartado es para agregar/registrar el producto */
if ($action === "add") {
    $data = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("INSERT INTO productos (tipo, nombre, descripcion, precio, precio_compra, unidad_medida, stock, fecha_registro)
                       VALUES (:tipo, :nombre, :descripcion, :precio, :precio_compra, :unidad_medida, :stock, NOW())");
    $ok = $stmt->execute([
        ":tipo" => $data["tipo"],
        ":nombre" => $data["nombre"],
        ":descripcion" => $data["descripcion"],
        ":precio" => $data["precio"],
        ":precio_compra" => $data["precio_compra"],
        ":unidad_medida" => $data["unidad_medida"],
        ":stock" => $data["stock"]
    ]);
    echo json_encode(["status" => $ok ? "ok" : "error"]);
    exit;
}
/*Eliminar producto y reordenar IDs*/
if ($action === "delete") {
    $id = $_GET["id"] ?? 0;
    // 1️⃣ Eliminar el producto
    $stmt = $pdo->prepare("DELETE FROM productos WHERE id_producto = :id");
    $ok = $stmt->execute([":id" => $id]);
    if ($ok) {
        // 2️⃣ Reordenar IDs
        $pdo->exec("SET @count = 0");
        $pdo->exec("UPDATE productos SET id_producto = @count:=@count+1 ORDER BY id_producto");
        // 3️⃣ Reiniciar AUTO_INCREMENT
        $max = $pdo->query("SELECT MAX(id_producto) AS max_id FROM productos")->fetch(PDO::FETCH_ASSOC);
        $next = $max['max_id'] + 1;
        $pdo->exec("ALTER TABLE productos AUTO_INCREMENT = $next");
    }
    echo json_encode([
        "status" => $ok ? "ok" : "error",
        "message" => $ok ? "Producto eliminado correctamente" : "No se pudo eliminar"
    ]);
    exit;
}
/* Editar producto */
if ($action === "edit") {
    $data = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("UPDATE productos 
                           SET tipo = :tipo, nombre = :nombre, descripcion = :descripcion, 
                           precio = :precio, precio_compra = :precio_compra,
                           unidad_medida = :unidad_medida, stock = :stock
                           WHERE id_producto = :id");
    $ok = $stmt->execute([
        ":tipo"          => $data["tipo"],
        ":nombre"        => $data["nombre"],
        ":descripcion"   => $data["descripcion"],
        ":precio"        => $data["precio"],
        ":precio_compra" => $data["precio_compra"],
        ":unidad_medida" => $data["unidad_medida"],
        ":stock"         => $data["stock"],
        ":id"            => $data["id_producto"]
    ]);
    echo json_encode(["status" => $ok ? "ok" : "error"]);
    exit;
}
/*Este apartado es para registrar la venta*/
if ($action === "venta_ticket") {
    $data = json_decode(file_get_contents("php://input"), true);
    $productos = $data["productos"] ?? [];
    $total     = $data["total"] ?? 0;
    $pdo->beginTransaction();
    try {
        // Insertar venta
        $stmtV = $pdo->prepare("INSERT INTO venta (fecha_venta, total) VALUES (CURDATE(), ?)");
        $stmtV->execute([$total]);
        $id_venta = $pdo->lastInsertId();

        // Insertar detalle venta y actualizar stock
        foreach ($productos as $p) {
            $cantidad = floatval($p["cantidad"]);

            $stmtD = $pdo->prepare("
                INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmtD->execute([
                $id_venta,
                $p["id_producto"],
                $cantidad,
                $p["precio_unitario"],
                $p["total"]
            ]);

            $stmtUpd = $pdo->prepare("UPDATE productos SET stock = GREATEST(stock - ?, 0) WHERE id_producto = ?");
            $stmtUpd->execute([$cantidad, $p["id_producto"]]);
        }
        $pdo->commit();
        echo json_encode([
            "status"   => "ok",
            "id_venta" => $id_venta
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode([
            "status" => "error",
            "error"  => $e->getMessage()
        ]);
    }
    exit;
}

/* Este apartado es para obtener el detalle de ventas*/
if ($action === "detalle_ventas") {
    $sql = "
        SELECT 
            v.fecha_venta,
            d.id_detalle,
            d.id_venta,
            d.id_producto,
            p.nombre,
            p.precio_compra,
            p.unidad_medida,   
            d.cantidad,
            d.precio_unitario,
            d.subtotal AS total
        FROM detalle_venta d
        INNER JOIN productos p ON p.id_producto = d.id_producto
        INNER JOIN venta v ON v.id_venta = d.id_venta
        ORDER BY v.fecha_venta ASC, d.id_venta ASC, d.id_detalle ASC
    ";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $tickets = [];

    foreach ($rows as $row) {

        $id_venta = $row['id_venta']; // ticket real

        if (!isset($tickets[$id_venta])) {
            $tickets[$id_venta] = [
                "ticket" => $id_venta,  // número real
                "fecha_venta" => $row['fecha_venta'],
                "productos" => []
            ];
        }

        $tickets[$id_venta]['productos'][] = $row;
    }
    echo json_encode(array_values($tickets));
    exit;
}

// Dinero en caja (inversión) y ganancia del día
if ($action === "dashboard") {
    // Dinero invertido: suma de stock * precio_compra
    $stmt = $pdo->query("SELECT SUM(stock * precio_compra) AS total_inversion FROM productos");
    $totalInversion = $stmt->fetchColumn() ?? 0;
    // Ganancia del día (por si quieres devolverla aquí también)
    $hoy = date("Y-m-d");
    $stmtG = $pdo->prepare("
        SELECT SUM( (d.precio_unitario - p.precio_compra) * d.cantidad ) AS ganancia
        FROM detalle_venta d
        INNER JOIN productos p ON p.id_producto = d.id_producto
        INNER JOIN venta v ON v.id_venta = d.id_venta
        WHERE v.fecha_venta = ?
    ");
    $stmtG->execute([$hoy]);
    $gananciaHoy = $stmtG->fetchColumn() ?? 0;

    echo json_encode([
        "total_caja" => $totalInversion,
        "ganancia_hoy" => $gananciaHoy
    ]);
    exit;
}

// Ganancia del mes
if ($action === "ganancia_mes") {
    $stmt = $pdo->query("
        SELECT 
            SUM( (dv.cantidad * dv.precio_unitario) - (dv.cantidad * p.precio_compra) ) AS ganancia_mes
        FROM detalle_venta dv
        INNER JOIN venta v ON dv.id_venta = v.id_venta
        INNER JOIN productos p ON dv.id_producto = p.id_producto
        WHERE MONTH(v.fecha_venta) = MONTH(CURDATE())
        AND YEAR(v.fecha_venta) = YEAR(CURDATE())
    ");
    $gananciaMes = $stmt->fetchColumn();
    echo json_encode([
        "ganancia_mes" => $gananciaMes ? $gananciaMes : 0
    ]);
    exit;
}


// Ganancia por fecha 
if ($action == "ganancia_fecha") {
    $fecha = $_GET["fecha"] ?? date("Y-m-d");

    $stmt = $pdo->prepare("
        SELECT 
            SUM( (dv.cantidad * dv.precio_unitario) - (dv.cantidad * p.precio_compra) ) AS ganancia
        FROM detalle_venta dv
        INNER JOIN productos p ON dv.id_producto = p.id_producto
        INNER JOIN venta v ON dv.id_venta = v.id_venta
        WHERE v.fecha_venta = :fecha
    ");
    $stmt->execute([":fecha" => $fecha]);
    $ganancia = $stmt->fetchColumn();

    echo json_encode([
        "ganancia" => $ganancia ? $ganancia : 0
    ]);
    exit;
}


/*Este apartado es para registrar el usuario*/
if ($action === "register") {
    $usuario = $data["usuario"];
    $pass    = $data["password"];
    // Verificar que no exista
    $check = $pdo->prepare("SELECT id_usuario FROM usuario WHERE usuario_nombre=?");
    $check->execute([$usuario]);

    if ($check->rowCount() > 0) {
        echo json_encode(["status" => "error", "error" => "Usuario ya existe"]);
        exit;
    }
    // Insertar usuario
    $stmt = $pdo->prepare("INSERT INTO usuario (usuario_nombre, password) VALUES (?, ?)");
    $ok = $stmt->execute([$usuario, $pass]);

    echo json_encode(["status" => $ok ? "ok" : "error"]);
    exit;
}

/* Login de usuario (iniciar sesión)*/
if ($action === "login") {

    $stmt = $pdo->prepare("SELECT id_usuario FROM usuario WHERE usuario_nombre=? AND password=?");
    $stmt->execute([$data["usuario"], $data["password"]]);

    echo json_encode(["status" => $stmt->rowCount() > 0 ? "ok" : "error"]);
    exit;
}

/* ============================
   CAMBIAR CONTRASEÑA
============================ */
if ($action === "changePass") {

    // 1️⃣ Verificar si el usuario existe
    $check = $pdo->prepare("SELECT id_usuario FROM usuario WHERE usuario_nombre=?");
    $check->execute([$data["usuario"]]);

    if ($check->rowCount() === 0) {
        echo json_encode(["status" => "no_user"]);
        exit;
    }

    // 2️⃣ Actualizar contraseña
    $stmt = $pdo->prepare("UPDATE usuario SET password=? WHERE usuario_nombre=?");
    $ok = $stmt->execute([$data["password"], $data["usuario"]]);

    echo json_encode(["status" => $ok ? "ok" : "error"]);
    exit;
}
echo json_encode(["status" => "error", "message" => "Acción no válida"]);
?>