async function loadHistori(idBarang) {
    try {
        const response = await fetch(`/pemilik/histori-kepemilikan/${idBarang}`);
        const data = await response.json();

        const tableBody = document.getElementById('historiTableBody');
        tableBody.innerHTML = data.map(item => `
        <tr>
            <td>${new Date(item.tanggal_perolehan).toLocaleDateString('id-ID')}</td>
            <td>${item.nama_karyawan}</td>
            <td>${item.status_kepemilikan}</td>
        </tr>
    `).join('');
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

