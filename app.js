const express = require('express');           // Mengimport modul Express untuk membuat server
const mysql = require('mysql');               // Mengimport modul MySQL untuk menghubungkan ke database MySQL
const path = require('path');                 // Mengimport modul Path untuk menangani path file
const app = express();                        // Membuat instance aplikasi Express
const PORT = 3000;                            // Menentukan port di mana server akan berjalan

// Mengatur koneksi ke database MySQL
const db = mysql.createConnection({
    host: 'localhost',                        // Host database (localhost dalam hal ini)
    user: 'root',                             // Username database
    password: '',                             // Password database (kosong dalam hal ini)
    database: 'iot'                           // Nama database yang akan digunakan
});

// Menghubungkan ke database
db.connect(err => {
    if (err) {                                // Jika ada error saat menghubungkan
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database');     // Jika berhasil terhubung
});

// Fungsi untuk menjalankan query database menggunakan Promise
const queryDatabase = (query) => {
    return new Promise((resolve, reject) => {
        db.query(query, (err, results) => {   // Menjalankan query
            if (err) {                        // Jika error, tolak Promise dengan error tersebut
                return reject(err);
            }
            resolve(results);                 // Jika berhasil, selesaikan Promise dengan hasil query
        });
    });
};

// Endpoint untuk mengirim file HTML utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Mengirim file index.html sebagai response
});

// Endpoint untuk mengambil data cuaca dari database
app.get('/data-cuaca', async (req, res) => {
    try {
        const results = {};                   // Objek untuk menyimpan hasil query

        // Query untuk mendapatkan suhu maksimum
        const suhumaxResult = await queryDatabase('SELECT MAX(suhu) AS suhumax FROM tb_cuaca');
        results.suhumax = suhumaxResult[0].suhumax;   // Menyimpan suhu maksimum ke dalam objek hasil

        // Query untuk mendapatkan suhu minimum
        const suhumminResult = await queryDatabase('SELECT MIN(suhu) AS suhummin FROM tb_cuaca');
        results.suhumin = suhumminResult[0].suhummin; // Menyimpan suhu minimum ke dalam objek hasil

        // Query untuk mendapatkan suhu rata-rata
        const suhurataResult = await queryDatabase('SELECT AVG(suhu) AS suhurata FROM tb_cuaca');
        results.suhurata = parseFloat(suhurataResult[0].suhurata).toFixed(2); // Menyimpan suhu rata-rata dengan dua desimal

        // Query untuk mengambil data spesifik berdasarkan ID
        const maxEntriesQuery = `
            SELECT id AS idx, suhu, humid, lux AS kecerahan, ts AS timestamp 
            FROM tb_cuaca 
            WHERE id IN (101, 226) 
            ORDER BY ts
        `;
        const maxEntriesResult = await queryDatabase(maxEntriesQuery);
        results.nilai_suhu_max_humid_max = maxEntriesResult.map(row => ({ // Mapping hasil ke dalam format yang dibutuhkan
            idx: row.idx,
            suhu: row.suhu,
            humid: row.humid,
            kecerahan: row.kecerahan,
            timestamp: row.timestamp
        }));

        // Query untuk mengambil data bulan dan tahun berdasarkan suhu maksimum atau kelembaban maksimum
        const monthYearMaxQuery = `
            SELECT month_year
            FROM (
                SELECT DISTINCT DATE_FORMAT(ts, '%c-%Y') AS month_year, ts
                FROM tb_cuaca
                WHERE suhu = (SELECT MAX(suhu) FROM tb_cuaca) 
                   OR humid = (SELECT MAX(humid) FROM tb_cuaca)
            ) AS subquery
            WHERE month_year IN ('9-2010', '5-2011')
            ORDER BY ts
        `;
        const monthYearMaxResult = await queryDatabase(monthYearMaxQuery);
        results.month_year_max = monthYearMaxResult.map(row => ({    // Mapping hasil bulan dan tahun
            month_year: row.month_year
        }));

        res.json(results);                     // Mengirim objek hasil sebagai JSON
    } catch (error) {                          // Jika terjadi error
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' }); // Mengirim response error dengan kode 500
    }
});

// Menjalankan server pada port yang ditentukan
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
