document.addEventListener('DOMContentLoaded', function () {
    console.log('Search script loaded');

    const searchInput = document.querySelector('.navbar-search input');
    if (!searchInput) {
        console.error('Search input not found');
        return;
    }

    console.log('Search input found:', searchInput);

    const searchResults = document.createElement('div');
    searchResults.className = 'search-results ';
    searchInput.parentElement.appendChild(searchResults);

    let debounceTimeout = null;

    async function performSearch(query) {
        try {
            console.log('Performing search for:', query);

            const response = await fetch(`/search?query=${encodeURIComponent(query)}`);
            console.log('Search response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const results = await response.json();
            console.log('Search results:', results);

            return results;
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    function updateSearchResults(results) {
        if (results.length > 0) {
            searchResults.innerHTML = results.map(result => `
                    <a href="${result.url}" class="search-result-item">
                        <div class="search-result-type">${result.type}</div>
                        <div class="search-result-content">
                            <div class="search-result-title">${result.title}</div>
                            <div class="search-result-description">${result.description}</div>
                        </div>
                    </a>
                `).join('');
        } else {
            searchResults.innerHTML = '<div class="search-result-empty">Tidak ada hasil ditemukan</div>';
        }
        searchResults.style.display = 'block';
    }

    searchInput.addEventListener('input', function (e) {
        const query = e.target.value.trim();
        console.log('Search input changed:', query);

        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }
        debounceTimeout = setTimeout(async () => {
            try {
                const results = await performSearch(query);
                updateSearchResults(results);
            } catch (error) {
                searchResults.innerHTML = '<div class="search-result-empty">Terjadi kesalahan saat mencari</div>';
                searchResults.style.display = 'block';
            }
        }, 300);
    });
    document.addEventListener('click', function (e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
    console.log('Search event listeners attached');
});