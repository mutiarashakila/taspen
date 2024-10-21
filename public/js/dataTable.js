// DataTable.js
const loadTableData = async () => {
    const dataTable = document.getElementById('dataTable');
    const tbody = dataTable.querySelector('tbody');
    
    try {
      const response = await fetch('/api/barang');
      const data = await response.json();
      
      tbody.innerHTML = '';
      
      data.forEach(item => {
        const masaLelang = item.waktu_selesai && item.waktu_mulai ? 
          Math.ceil((new Date(item.waktu_selesai) - new Date(item.waktu_mulai)) / (1000 * 60 * 60 * 24 * 365)) + ' Tahun' : 
          '-';
          
        const row = `
          <tr>
            <td style="width: 16.781px;">${item.id_barang}</td>
            <td style="transform: translate(-20px);">${item.nama_barang}</td>
            <td style="transform: translate(-25px);">${item.kategori}</td>
            <td style="transform: translate(-17px);">${item.lokasi_barang}</td>
            <td style="transform: translate(-31px);">${item.pemilik || '-'}</td>
            <td style="transform: translate(-35px);text-align: center;font-size: 15px;">${masaLelang}</td>
            <td>${item.status_lelang || '-'}</td>
            <td style="background: rgb(255,0,0);">
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" 
                  viewBox="0 0 16 16" class="bi bi-trash3-fill delete-btn" 
                  data-id="${item.id_barang}"
                  style="border-color: var(--bs-table-color);font-size: 20px;color: var(--bs-table-active-color);margin: 27px;">
                <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5"></path>
              </svg>
            </td>
          </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
      });
  
      // Add delete event listeners
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.closest('.delete-btn').dataset.id;
          if (confirm('Are you sure you want to delete this item?')) {
            try {
              const response = await fetch(`/api/barang/${id}`, {
                method: 'DELETE'
              });
              if (response.ok) {
                loadTableData(); // Reload table after deletion
              }
            } catch (error) {
              console.error('Error deleting item:', error);
            }
          }
        });
      });
  
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };
  
  // Load data when page loads
  document.addEventListener('DOMContentLoaded', loadTableData);