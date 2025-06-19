document.addEventListener('DOMContentLoaded', () => {
    const cardsPerPageOptions = [1, 2, 4, 6, 8, 10];
    let cardsPerPage = parseInt(localStorage.getItem('cardsPerPage')) || cardsPerPageOptions[0];
    let currentPage = 1;
    let sortOption = localStorage.getItem('sortOption') || 'none';
    let productFilters = [];
    let priceRange = { min: 0, max: 1000 };
    let yearRange = { min: 2000, max: 2025 };
    let isLoading = false;

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function toggleLoadingOverlay(show) {
        const container = document.getElementById('cards-container');
        let loadingOverlay = container.querySelector('.loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = '<p>Loading...</p>';
            container.appendChild(loadingOverlay);
        }
        loadingOverlay.classList.toggle('active', show);
    }

    function createCardsPerPageSelector() {
        const container = document.getElementById('sort-cards-container');
        if (!container) {
            console.error('Element sort-cards-container not found');
            return;
        }
        container.innerHTML = `
            <label for="cards-per-page">Карточек на странице: </label>
            <select id="cards-per-page" class="cards-per-page-select">
                ${cardsPerPageOptions.map(option => `
                    <option value="${option}" ${option === cardsPerPage ? 'selected' : ''}>${option}</option>
                `).join('')}
            </select>
            <label for="sort-options">Сортировка: </label>
            <select id="sort-options" class="sort-options-select">
                <option value="none" ${sortOption === 'none' ? 'selected' : ''}>Нет</option>
                <option value="name-asc" ${sortOption === 'name-asc' ? 'selected' : ''}>По названию (А-Я)</option>
                <option value="name-desc" ${sortOption === 'name-desc' ? 'selected' : ''}>По названию (Я-А)</option>
                <option value="rating-desc" ${sortOption === 'rating-desc' ? 'selected' : ''}>По рейтингу (высокий - низкий)</option>
                <option value="rating-asc" ${sortOption === 'rating-asc' ? 'selected' : ''}>По рейтингу (низкий - высокий)</option>
                <option value="price-desc" ${sortOption === 'price-desc' ? 'selected' : ''}>По цене (высокая - низкая)</option>
                <option value="price-asc" ${sortOption === 'price-asc' ? 'selected' : ''}>По цене (низкая - высокая)</option>
                <option value="reviews-desc" ${sortOption === 'reviews-desc' ? 'selected' : ''}>По отзывам (много - мало)</option>
                <option value="reviews-asc" ${sortOption === 'reviews-asc' ? 'selected' : ''}>По отзывам (мало - много)</option>
            </select>
        `;

        document.getElementById('cards-per-page').addEventListener('change', (e) => {
            cardsPerPage = parseInt(e.target.value);
            localStorage.setItem('cardsPerPage', cardsPerPage);
            currentPage = 1;
            window.loadProducts();
        });

        document.getElementById('sort-options').addEventListener('change', (e) => {
            sortOption = e.target.value;
            localStorage.setItem('sortOption', sortOption);
            currentPage = 1;
            window.loadProducts();
        });
    }

    function createPaginationButtons(totalProducts) {
        const container = document.getElementById('count-cards-container');
        if (!container) {
            console.error('Element count-cards-container not found');
            return;
        }
        const totalPages = Math.ceil(totalProducts / cardsPerPage);
        container.innerHTML = '';

        if (totalPages <= 1) return;

        const firstButton = document.createElement('button');
        firstButton.textContent = '<<';
        firstButton.className = 'pagination-button';
        firstButton.disabled = currentPage === 1;
        firstButton.addEventListener('click', () => {
            currentPage = 1;
            window.loadProducts();
        });
        container.appendChild(firstButton);

        const prevButton = document.createElement('button');
        prevButton.textContent = '<';
        prevButton.className = 'pagination-button';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                window.loadProducts();
            }
        });
        container.appendChild(prevButton);

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.className = `pagination-button ${i === currentPage ? 'active' : ''}`;
            button.addEventListener('click', () => {
                currentPage = i;
                window.loadProducts();
            });
            container.appendChild(button);
        }

        const nextButton = document.createElement('button');
        nextButton.textContent = '>';
        nextButton.className = 'pagination-button';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                window.loadProducts();
            }
        });
        container.appendChild(nextButton);

        const lastButton = document.createElement('button');
        lastButton.textContent = '>>';
        lastButton.className = 'pagination-button';
        lastButton.disabled = currentPage === totalPages;
        lastButton.addEventListener('click', () => {
            currentPage = totalPages;
            window.loadProducts();
        });
        container.appendChild(lastButton);
    }

    function sortProducts(products, reviews, ratings) {
        const sortedProducts = [...products];
        if (sortOption === 'none') return sortedProducts;

        sortedProducts.forEach(product => {
            const productReviews = reviews.filter(review => review.productId === product.id);
            const productRatings = ratings.filter(rating => rating.productId === product.id);
            product.reviewCount = productReviews.length;
            product.averageRating = productRatings.length > 0
                ? productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length
                : 0;
        });

        switch (sortOption) {
            case 'name-asc':
                sortedProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'name-desc':
                sortedProducts.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
                break;
            case 'rating-desc':
                sortedProducts.sort((a, b) => b.averageRating - a.averageRating);
                break;
            case 'rating Souls':
                sortedProducts.sort((a, b) => a.averageRating - b.averageRating);
                break;
            case 'price-desc':
                sortedProducts.sort((a, b) => b.price - a.price);
                break;
            case 'price-asc':
                sortedProducts.sort((a, b) => a.price - b.price);
                break;
            case 'reviews-desc':
                sortedProducts.sort((a, b) => b.reviewCount - a.reviewCount);
                break;
            case 'reviews-asc':
                sortedProducts.sort((a, b) => a.reviewCount - b.reviewCount);
                break;
        }
        return sortedProducts;
    }

    function filterProducts(products) {
        let filteredProducts = products;

        const includeNameFilters = productFilters.filter(f => f.type === 'name' && f.mode === 'include');
        const includeFirmFilters = productFilters.filter(f => f.type === 'firm' && f.mode === 'include');
        const excludeNameFilters = productFilters.filter(f => f.type === 'name' && f.mode === 'exclude');
        const excludeFirmFilters = productFilters.filter(f => f.type === 'firm' && f.mode === 'exclude');
        const priceFilter = productFilters.find(f => f.type === 'price');
        const yearFilter = productFilters.find(f => f.type === 'year');
        const searchFilter = productFilters.find(f => f.type === 'search');

        console.log('Applying filters:', { includeNameFilters, includeFirmFilters, excludeNameFilters, excludeFirmFilters, priceFilter, yearFilter, searchFilter });

        if (searchFilter) {
            filteredProducts = filteredProducts.filter(product => {
                const name = product.name ? product.name.toLowerCase() : '';
                return name.includes(searchFilter.value.toLowerCase());
            });
        }

        const hasIncludeFilters = includeNameFilters.length > 0 || includeFirmFilters.length > 0;
        if (hasIncludeFilters) {
            filteredProducts = filteredProducts.filter(product => {
                const nameMatch = includeNameFilters.length > 0
                    ? includeNameFilters.some(filter => product.name && product.name.trim() === filter.value)
                    : true;
                const firmMatch = includeFirmFilters.length > 0
                    ? includeFirmFilters.some(filter => product.firmName && product.firmName.trim() === filter.value)
                    : true;
                return nameMatch && firmMatch;
            });
        }

        filteredProducts = filteredProducts.filter(product => {
            const nameExcluded = excludeNameFilters.some(filter => product.name && product.name.trim() === filter.value);
            const firmExcluded = excludeFirmFilters.some(filter => product.firmName && product.firmName.trim() === filter.value);
            return !nameExcluded && !firmExcluded;
        });

        if (priceFilter) {
            filteredProducts = filteredProducts.filter(product => {
                const price = parseFloat(product.price) || 0;
                return price >= priceFilter.min && price <= priceFilter.max;
            });
        }

        if (yearFilter) {
            filteredProducts = filteredProducts.filter(product => {
                const year = parseInt(product.manufacturingYear) || 0;
                console.log(`Product ${product.name}: manufacturingYear=${year}, filter range=[${yearFilter.min}, ${yearFilter.max}]`);
                return year >= yearFilter.min && year <= yearFilter.max && year !== 0;
            });
        }

        console.log('Filtered products:', filteredProducts.length, filteredProducts.map(p => ({ name: p.name, manufacturingYear: p.manufacturingYear })));
        return filteredProducts;
    }

    function populateProductNameFilter(products) {
        const select = document.getElementById('product-name-filter');
        if (!select) {
            console.error('Элемент product-name-filter не найден');
            return;
        }
        select.innerHTML = '<option value="" disabled selected>Выберите товар</option>';
        const uniqueNames = [...new Set(products.map(p => p.name).filter(name => name))].sort();
        uniqueNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    }

    function populateFirmNameFilter(products) {
        const select = document.getElementById('firm-name-filter');
        if (!select) {
            console.error('Элемент firm-name-filter не найден');
            return;
        }
        select.innerHTML = '<option value="" disabled selected>Выберите фирму</option>';
        const uniqueFirms = [...new Set(products.map(p => p.firmName).filter(firm => firm))].sort();
        if (uniqueFirms.length === 0) {
            select.innerHTML = '<option value="" disabled selected>Фирмы отсутствуют</option>';
            select.disabled = true;
        } else {
            uniqueFirms.forEach(firm => {
                const option = document.createElement('option');
                option.value = firm;
                option.textContent = firm;
                select.appendChild(option);
            });
        }
    }

    function setupPriceFilter(products) {
        const priceMinInput = document.getElementById('price-min');
        const priceMaxInput = document.getElementById('price-max');
        const priceMinValue = document.getElementById('price-min-value');
        const priceMaxValue = document.getElementById('price-max-value');

        if (!priceMinInput || !priceMaxInput || !priceMinValue || !priceMaxValue) {
            console.error('Price filter elements not found');
            return;
        }

        const prices = products.map(p => parseFloat(p.price) || 0).filter(p => p > 0);
        const minPrice = prices.length > 0 ? Math.floor(Math.min(...prices)) : 0;
        const maxPrice = prices.length > 0 ? Math.ceil(Math.max(...prices)) : 1000;

        priceRange = { min: minPrice, max: maxPrice };

        priceMinInput.min = minPrice;
        priceMinInput.max = maxPrice;
        priceMaxInput.min = minPrice;
        priceMaxInput.max = maxPrice;
        priceMinInput.value = minPrice;
        priceMaxInput.value = maxPrice;

        priceMinValue.textContent = `${minPrice} ₽`;
        priceMaxValue.textContent = `${maxPrice} ₽`;

        const updatePriceFilter = debounce(() => {
            let minVal = parseFloat(priceMinInput.value);
            let maxVal = parseFloat(priceMaxInput.value);

            if (minVal > maxVal) {
                [minVal, maxVal] = [maxVal, minVal];
                priceMinInput.value = minVal;
                priceMaxInput.value = maxVal;
            }

            priceMinValue.textContent = `${minVal} ₽`;
            priceMaxValue.textContent = `${maxVal} ₽`;

            productFilters = productFilters.filter(f => f.type !== 'price');
            if (minVal > minPrice || maxVal < maxPrice) {
                productFilters.push({ type: 'price', min: minVal, max: maxVal });
            }

            currentPage = 1;
            window.loadProducts();
        }, 300);

        priceMinInput.addEventListener('input', updatePriceFilter);
        priceMaxInput.addEventListener('input', updatePriceFilter);
    }

    function setupYearFilter(products) {
        const yearMinInput = document.getElementById('year-min');
        const yearMaxInput = document.getElementById('year-max');
        const yearMinValue = document.getElementById('year-min-value');
        const yearMaxValue = document.getElementById('year-max-value');

        if (!yearMinInput || !yearMaxInput || !yearMinValue || !yearMaxValue) {
            console.error('Year filter elements not found');
            return;
        }

        const years = products.map(p => parseInt(p.manufacturingYear) || 0).filter(y => y > 0);
        const minYear = years.length > 0 ? Math.floor(Math.min(...years)) : 2000;
        const maxYear = years.length > 0 ? Math.ceil(Math.max(...years)) : 2025;

        yearRange = { min: minYear, max: maxYear };

        yearMinInput.min = minYear;
        yearMinInput.max = maxYear;
        yearMaxInput.min = minYear;
        yearMaxInput.max = maxYear;
        yearMinInput.value = minYear;
        yearMaxInput.value = maxYear;

        yearMinValue.textContent = `${minYear}`;
        yearMaxValue.textContent = `${maxYear}`;

        const updateYearFilter = debounce(() => {
            let minVal = parseInt(yearMinInput.value);
            let maxVal = parseInt(yearMaxInput.value);

            if (minVal > maxVal) {
                [minVal, maxVal] = [maxVal, minVal];
                yearMinInput.value = minVal;
                yearMaxInput.value = maxVal;
            }

            yearMinValue.textContent = `${minVal}`;
            yearMaxValue.textContent = `${maxVal}`;

            productFilters = productFilters.filter(f => f.type !== 'year');
            if (minVal > minYear || maxVal < maxYear) {
                productFilters.push({ type: 'year', min: minVal, max: maxVal });
            }

            currentPage = 1;
            window.loadProducts();
        }, 300);

        yearMinInput.addEventListener('input', updateYearFilter);
        yearMaxInput.addEventListener('input', updateYearFilter);
    }

    function addFilterToFlowLayout(value, type) {
        if (!value || productFilters.some(f => f.value === value && f.type === type)) return;

        const flowLayout = document.getElementById('filter-flow-layout');
        if (!flowLayout) {
            console.error('Element filter-flow-layout not found');
            return;
        }
        const filterItem = document.createElement('div');
        filterItem.className = 'filter-item';
        filterItem.dataset.value = value;
        filterItem.dataset.type = type;
        const label = type === 'name' ? 'Товар' : type === 'firm' ? 'Фирма' : 'Поиск';
        filterItem.innerHTML = `
            <span>${label}: ${value}</span>
            <div class="radio-group">
                <input type="radio" name="filter-${type}-${value}" value="include" checked>
                <label>Показать</label>
                <input type="radio" name="filter-${type}-${value}" value="exclude">
                <label>Исключить</label>
            </div>
            <button class="remove-filter-btn">×</button>
        `;
        flowLayout.appendChild(filterItem);

        productFilters.push({ value, type, mode: 'include' });

        filterItem.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const filter = productFilters.find(f => f.value === value && f.type === type);
                if (filter) {
                    filter.mode = e.target.value;
                    currentPage = 1;
                    window.loadProducts();
                }
            });
        });

        filterItem.querySelector('.remove-filter-btn').addEventListener('click', () => {
            productFilters = productFilters.filter(f => !(f.value === value && f.type === type));
            filterItem.remove();
            currentPage = 1;
            window.loadProducts();
        });

        currentPage = 1;
        window.loadProducts();
    }

    function setupFilterControls(products) {
        console.log('Products for filters:', products);
        populateProductNameFilter(products);
        populateFirmNameFilter(products);
        setupPriceFilter(products);
        setupYearFilter(products);

        const productSelect = document.getElementById('product-name-filter');
        const firmSelect = document.getElementById('firm-name-filter');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        const headerSearchButton = document.querySelector('.header-search-btn');
        const headerSearchInput = document.getElementById('main-searchInput');
        const footerSearchButton = document.querySelector('.search-btn');
        const footerSearchInput = document.getElementById('searchInput');

        if (productSelect) {
            productSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value) {
                    addFilterToFlowLayout(value, 'name');
                    productSelect.value = '';
                }
            });
        }

        if (firmSelect) {
            firmSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value) {
                    addFilterToFlowLayout(value, 'firm');
                    firmSelect.value = '';
                }
            });
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                productFilters = [];
                const flowLayout = document.getElementById('filter-flow-layout');
                if (flowLayout) flowLayout.innerHTML = '';
                const priceMinInput = document.getElementById('price-min');
                const priceMaxInput = document.getElementById('price-max');
                if (priceMinInput && priceMaxInput) {
                    priceMinInput.value = priceRange.min;
                    priceMaxInput.value = priceRange.max;
                    document.getElementById('price-min-value').textContent = `${priceRange.min} ₽`;
                    document.getElementById('price-max-value').textContent = `${priceRange.max} ₽`;
                }
                const yearMinInput = document.getElementById('year-min');
                const yearMaxInput = document.getElementById('year-max');
                if (yearMinInput && yearMaxInput) {
                    yearMinInput.value = yearRange.min;
                    yearMaxInput.value = yearRange.max;
                    document.getElementById('year-min-value').textContent = `${yearRange.min}`;
                    document.getElementById('year-max-value').textContent = `${yearRange.max}`;
                }
                if (headerSearchInput) headerSearchInput.value = '';
                if (footerSearchInput) footerSearchInput.value = '';
                currentPage = 1;
                window.loadProducts();
            });
        }

        if (headerSearchButton && headerSearchInput) {
            headerSearchButton.addEventListener('click', (e) => {
                e.preventDefault();
                const searchValue = headerSearchInput.value.trim();
                if (searchValue) {
                    productFilters = productFilters.filter(f => f.type !== 'search');
                    addFilterToFlowLayout(searchValue, 'search');
                    headerSearchInput.value = '';
                } else {
                    productFilters = productFilters.filter(f => f.type !== 'search');
                    const flowLayout = document.getElementById('filter-flow-layout');
                    if (flowLayout) {
                        flowLayout.querySelectorAll('.filter-item[data-type="search"]').forEach(item => item.remove());
                    }
                    currentPage = 1;
                    window.loadProducts();
                }
            });
        }

        if (footerSearchButton && footerSearchInput) {
            footerSearchButton.addEventListener('click', (e) => {
                e.preventDefault();
                const searchValue = footerSearchInput.value.trim();
                if (searchValue) {
                    productFilters = productFilters.filter(f => f.type !== 'search');
                    addFilterToFlowLayout(searchValue, 'search');
                    footerSearchInput.value = '';
                } else {
                    productFilters = productFilters.filter(f => f.type !== 'search');
                    const flowLayout = document.getElementById('filter-flow-layout');
                    if (flowLayout) {
                        flowLayout.querySelectorAll('.filter-item[data-type="search"]').forEach(item => item.remove());
                    }
                    currentPage = 1;
                    window.loadProducts();
                }
            });
        }
    }

    fetch('/api/products', { credentials: 'include' })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(products => {
            console.log('Received products:', products);
            setupFilterControls(products);
            window.loadProducts();
        })
        .catch(err => {
            console.error('Error loading products for filters:', err);
            const container = document.getElementById('cards-container');
            if (container) {
                container.innerHTML = '<p>Ошибка загрузки фильтров</p>';
            }
        });

    window.loadProducts = debounce(function () {
        if (isLoading) return;
        isLoading = true;

        const container = document.getElementById('cards-container');
        const productsHeader = document.querySelector('section.header h2');
        if (!container) {
            console.error('Element cards-container not found');
            isLoading = false;
            return;
        }
        if (!productsHeader) {
            console.error('Element section.header h2 not found');
            isLoading = false;
            return;
        }

        toggleLoadingOverlay(true);

        fetch('/auth/status', { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(userData => {
                console.log('Auth status:', userData);
                const user = userData.isAuthenticated ? userData.user : null;

                Promise.all([
                    fetch('/api/products', { credentials: 'include' }).then(res => {
                        if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
                        return res.json();
                    }),
                    fetch('/api/photos', { credentials: 'include' }).then(res => res.ok ? res.json() : []).catch(() => []),
                    fetch('/api/reviews', { credentials: 'include' }).then(res => res.ok ? res.json() : []).catch(() => []),
                    fetch('/api/ratings', { credentials: 'include' }).then(res => res.ok ? res.json() : []).catch(() => []),
                    fetch('/api/favorites', { credentials: 'include' }).then(res => res.ok ? res.json() : []).catch(() => []),
                    fetch('/api/cart', { credentials: 'include' }).then(res => res.ok ? res.json() : []).catch(() => [])
                ])
                    .then(([products, photos, reviews, ratings, favorites, cart]) => {
                        console.log('Data loaded:', { products, photos, reviews, ratings, favorites, cart });

                        if (!products || products.length === 0) {
                            container.innerHTML = '<p>Нет продуктов для отображения</p>';
                            productsHeader.textContent = 'Товары (0)';
                            toggleLoadingOverlay(false);
                            isLoading = false;
                            return;
                        }

                        const filteredProducts = filterProducts(products);
                        const sortedProducts = sortProducts(filteredProducts, reviews, ratings);
                        const startIndex = (currentPage - 1) * cardsPerPage;
                        const endIndex = startIndex + cardsPerPage;
                        const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

                        productsHeader.textContent = `Товары (${filteredProducts.length})`;

                        createCardsPerPageSelector();
                        createPaginationButtons(sortedProducts.length);

                        container.innerHTML = '';
                        if (paginatedProducts.length === 0) {
                            container.innerHTML = '<p>Нет продуктов, соответствующих фильтрам</p>';
                            productsHeader.textContent = `Товары (${filteredProducts.length})`;
                            toggleLoadingOverlay(false);
                            isLoading = false;
                            return;
                        }

                        paginatedProducts.forEach(product => {
                            const productPhotos = photos.filter(photo => photo.productId === product.id);
                            const productReviews = reviews.filter(review => review.productId === product.id);
                            const productRatings = ratings.filter(rating => rating.productId === product.id);
                            const averageRating = productRatings.length > 0
                                ? (productRatings.reduce((sum, r) => sum + r.rating, 0) / productRatings.length).toFixed(1)
                                : 0;

                            let userRating = 0;
                            if (user) {
                                const userRatingData = ratings.find(rating => rating.productId === product.id && rating.userId === user.id);
                                userRating = userRatingData ? userRatingData.rating : 0;
                            }

                            const isFavorite = user && favorites.some(fav => fav.productId === product.id);
                            const cartItem = user && cart.find(item => item.productId === product.id);
                            const isInCart = !!cartItem;
                            const cartQuantity = cartItem ? cartItem.quantity : 0;

                            const card = document.createElement('article');
                            card.className = 'card';
                            card.innerHTML = `
                                <div class="box">
                                    <div class="imgBx">
                                        <div class="walkthrough">
                                            <div class="walkthrough-body">
                                                <ul class="screens animate"></ul>
                                                <button class="prev-screen"><i class="icon-angle-left">◄</i></button>
                                                <button class="next-screen"><i class="icon-angle-right">►</i></button>
                                                <div class="controls">
                                                    <div class="caption"></div>
                                                    <div class="walkthrough-pagination"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="custom-transparent-block">
                                        <div class="custom-child-block ${isFavorite ? 'favorite-active' : ''}" id="first-custom-child-block" data-product-id="${product.id}"></div>
                                        <div class="custom-child-block ${isInCart ? 'cart-active' : ''}" id="second-custom-child-block" data-product-id="${product.id}">
                                            ${isInCart ? `
                                                <div class="cart-controls">
                                                    <button class="cart-decrement">-</button>
                                                    <span class="cart-quantity">${cartQuantity}</span>
                                                    <button class="cart-increment">+</button>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="box">
                                    <div class="content">
                                        <div class="priceDiv">
                                            <div class="oldPriceDiv">
                                                ${product.lastPrice ? `<div class="profitDiv">${((product.lastPrice - product.price) / product.lastPrice * 100).toFixed(0)}%</div>` : ''}
                                            </div>
                                            <p class="priceCard">${(product.price || 0).toFixed(2)} ₽</p>
                                            <div class="oldPriceDiv">
                                                ${product.lastPrice ? `<p class="oldPriceCard">${product.lastPrice.toFixed(2)} ₽</p>` : ''}
                                            </div>
                                        </div>
                                        <div class="nameDiv">
                                            <h2>${product.name || 'Без названия'}</h2>
                                            <span><a href="#">${product.firmName || 'Производитель неизвестен'}</a></span>
                                        </div>
                                        <div class="ulDiv">
                                            <ul>
                                                <li>Отзывы:<span>${productReviews.length}</span></li>
                                                <li>Продано:<span>${product.soldQuantity || 0}</span></li>
                                                <li>Рейтинг:<span>${averageRating}</span></li>
                                            </ul>
                                        </div>
                                        <button class="buttonPereyti" data-product-id="${product.id}">Перейти</button>
                                    </div>
                                </div>
                                <div class="circle">
                                    <div class="imgBx">
                                        ${product.imageLogo ? `<img src="data:image/jpeg;base64,${product.imageLogo}" alt="${product.name || 'Логотип'}">` : '<img src="../img/icons/google-plus.png" alt="Placeholder">'}
                                    </div>
                                </div>
                                <div class="rating-container" data-product-id="${product.id}">
                                    <div class="rating-box" data-rating="5"></div>
                                    <div class="rating-box" data-rating="4"></div>
                                    <div class="rating-box" data-rating="3"></div>
                                    <div class="rating-box" data-rating="2"></div>
                                    <div class="rating-box" data-rating="1"></div>
                                </div>
                            `;

                            const screensList = card.querySelector('.screens');
                            const pagination = card.querySelector('.walkthrough-pagination');
                            const caption = card.querySelector('.caption');
                            const slidesData = productPhotos.map((photo, index) => ({
                                imageUrl: `data:image/jpeg;base64,${photo.image}`,
                                caption: `Фото ${index + 1}`
                            }));

                            const walkthrough = {
                                index: 0,
                                initSlides: function () {
                                    slidesData.forEach((slide, index) => {
                                        const li = document.createElement('li');
                                        li.className = 'screen';
                                        li.dataset.caption = slide.caption;
                                        li.innerHTML = `<img class="slide-image" src="${slide.imageUrl}" alt="${slide.caption}">`;
                                        if (index === 0) li.classList.add('active');
                                        screensList.appendChild(li);

                                        const dot = document.createElement('a');
                                        dot.className = 'dot';
                                        if (index === 0) dot.classList.add('active');
                                        pagination.appendChild(dot);
                                    });
                                },
                                nextScreen: function () {
                                    if (this.index < this.indexMax()) {
                                        this.index++;
                                        this.updateScreen();
                                    }
                                },
                                prevScreen: function () {
                                    if (this.index > 0) {
                                        this.index--;
                                        this.updateScreen();
                                    }
                                },
                                updateScreen: function () {
                                    this.reset();
                                    this.goTo(this.index);
                                    this.setBtns();
                                },
                                setBtns: function () {
                                    const nextBtn = card.querySelector('.next-screen');
                                    const prevBtn = card.querySelector('.prev-screen');
                                    nextBtn.disabled = this.index === this.indexMax();
                                    prevBtn.disabled = this.index === 0;
                                },
                                goTo: function (index) {
                                    const screens = screensList.querySelectorAll('.screen');
                                    const dots = pagination.querySelectorAll('.dot');
                                    if (screens[index]) {
                                        screens[index].classList.add('active');
                                        dots[index].classList.add('active');
                                        caption.textContent = screens[index].dataset.caption;
                                    }
                                },
                                reset: function () {
                                    screensList.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
                                    pagination.querySelectorAll('.dot').forEach(dot => dot.classList.remove('active'));
                                    caption.textContent = '';
                                },
                                indexMax: function () {
                                    return slidesData.length - 1;
                                }
                            };

                            if (slidesData.length > 0) {
                                walkthrough.initSlides();
                                walkthrough.updateScreen();

                                card.querySelector('.next-screen').addEventListener('click', () => walkthrough.nextScreen());
                                card.querySelector('.prev-screen').addEventListener('click', () => walkthrough.prevScreen());
                                pagination.addEventListener('click', (e) => {
                                    const dot = e.target.closest('.dot');
                                    if (dot) {
                                        walkthrough.index = Array.from(pagination.querySelectorAll('.dot')).indexOf(dot);
                                        walkthrough.updateScreen();
                                    }
                                });

                                card.addEventListener('keydown', (e) => {
                                    if (e.which === 37) walkthrough.prevScreen();
                                    else if (e.which === 39) walkthrough.nextScreen();
                                });
                            } else {
                                card.querySelector('.walkthrough-body').innerHTML = '<p>Нет фотографий</p>';
                            }

                            const ratingBoxes = card.querySelectorAll('.rating-box');
                            const updateUserRatingDisplay = () => {
                                ratingBoxes.forEach(box => {
                                    const rating = parseInt(box.dataset.rating);
                                    box.classList.toggle('user-rated', rating <= userRating);
                                });
                            };

                            updateUserRatingDisplay();

                            ratingBoxes.forEach(box => {
                                box.addEventListener('mouseover', (event) => {
                                    const prevSibling = event.target.previousElementSibling;
                                    const prevPrevSibling = prevSibling?.previousElementSibling;
                                    const prevPrevPrevSibling = prevPrevSibling?.previousElementSibling;
                                    const prevPrevPrevPrevSibling = prevPrevPrevSibling?.previousElementSibling;
                                    const nextSibling = event.target.nextElementSibling;
                                    const nextNextSibling = nextSibling?.nextElementSibling;
                                    const nextNextNextSibling = nextNextSibling?.nextElementSibling;
                                    const nextNextNextNextSibling = nextNextNextSibling?.nextElementSibling;
                                    event.target.classList.add('hovered');
                                    if (prevPrevPrevPrevSibling) prevPrevPrevPrevSibling.classList.add('prev4');
                                    if (prevPrevPrevSibling) prevPrevPrevSibling.classList.add('prev3');
                                    if (prevPrevSibling) prevPrevSibling.classList.add('prev2');
                                    if (prevSibling) prevSibling.classList.add('prev1');
                                    if (nextSibling) nextSibling.classList.add('next1');
                                    if (nextNextSibling) nextNextSibling.classList.add('next2');
                                    if (nextNextNextSibling) nextNextNextSibling.classList.add('next3');
                                    if (nextNextNextNextSibling) nextNextNextNextSibling.classList.add('next4');
                                });

                                box.addEventListener('mouseout', (event) => {
                                    const parent = event.target.parentElement;
                                    parent.querySelectorAll('.next1, .next2, .next3, .next4, .prev1, .prev2, .prev3, .prev4, .hovered').forEach(sibling => {
                                        sibling.classList.remove('next1', 'next2', 'next3', 'next4', 'prev1', 'prev2', 'prev3', 'prev4', 'hovered');
                                    });
                                });

                                box.addEventListener('click', () => {
                                    if (!user) {
                                        alert('Пожалуйста, войдите в систему, чтобы оставить оценку.');
                                        return;
                                    }

                                    const rating = parseInt(box.dataset.rating);
                                    const productId = parseInt(card.querySelector('.rating-container').dataset.productId);

                                    fetch(`/api/ratings?productId=${productId}&userId=${user.id}`, { credentials: 'include' })
                                        .then(res => {
                                            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                                            return res.json();
                                        })
                                        .then(existingRatings => {
                                            const data = {
                                                productId: productId,
                                                userId: user.id,
                                                rating
                                            };

                                            const method = existingRatings.length > 0 ? 'PUT' : 'POST';
                                            const url = existingRatings.length > 0
                                                ? `/api/ratings/${existingRatings[0].id}`
                                                : '/api/ratings';

                                            fetch(url, {
                                                method,
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(data),
                                                credentials: 'include'
                                            })
                                                .then(res => {
                                                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                                                    return res.json();
                                                })
                                                .then(result => {
                                                    if (result.error) {
                                                        console.error('Rating error:', result);
                                                        alert(`Ошибка: ${result.error} (код: ${result.code})`);
                                                    } else {
                                                        userRating = rating;
                                                        updateUserRatingDisplay();
                                                        fetch('/api/ratings', { credentials: 'include' })
                                                            .then(res => res.json())
                                                            .then(updatedRatings => {
                                                                const newProductRatings = updatedRatings.filter(r => r.productId === product.id);
                                                                const newAverageRating = newProductRatings.length > 0
                                                                    ? (newProductRatings.reduce((sum, r) => sum + r.rating, 0) / newProductRatings.length).toFixed(1)
                                                                    : 0;
                                                                card.querySelector('.ulDiv li:nth-child(3) span').textContent = newAverageRating;
                                                            });
                                                    }
                                                })
                                                .catch(err => {
                                                    console.error('Error setting rating:', err);
                                                    alert('Ошибка при установке рейтинга');
                                                });
                                        })
                                        .catch(err => {
                                            console.error('Error checking rating:', err);
                                            alert('Ошибка при проверке рейтинга');
                                        });
                                });
                            });

                            const favoriteButton = card.querySelector('#first-custom-child-block');
                            const cartButton = card.querySelector('#second-custom-child-block');

                            favoriteButton.addEventListener('click', () => {
                                if (!user) {
                                    alert('Пожалуйста, войдите в систему, чтобы добавить товар в избранное.');
                                    return;
                                }

                                console.log(`Toggle favorite: productId=${product.id}, userId=${user.id}`);
                                fetch('/api/favorites/toggle', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ productId: product.id, userId: user.id }),
                                    credentials: 'include'
                                })
                                    .then(res => {
                                        console.log('Favorite toggle response:', res.status, res.statusText);
                                        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                                        return res.json();
                                    })
                                    .then(result => {
                                        console.log('Favorite toggle result:', result);
                                        if (result.error) {
                                            alert(`Ошибка: ${result.error} (код: ${result.code})`);
                                        } else {
                                            favoriteButton.classList.toggle('favorite-active', result.isFavorite);
                                            alert(result.message);
                                        }
                                    })
                                    .catch(err => {
                                        console.error('Error toggling favorite:', err);
                                        alert('Ошибка при работе с избранным');
                                    });
                            });

                            cartButton.addEventListener('click', (e) => {
                                if (e.target.closest('.cart-controls') || e.target.classList.contains('cart-controls')) {
                                    return;
                                }

                                if (!user) {
                                    alert('Пожалуйста, войдите в систему, чтобы добавить товар в корзину.');
                                    return;
                                }

                                const isInCart = cartButton.classList.contains('cart-active');
                                if (isInCart) {
                                    console.log(`Removing from cart: productId=${product.id}, userId=${user.id}`);
                                    fetch(`/api/cart/${product.id}`, {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: user.id }),
                                        credentials: 'include'
                                    })
                                        .then(res => {
                                            console.log('Cart delete response:', res.status, res.statusText);
                                            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                                            return res.json();
                                        })
                                        .then(result => {
                                            console.log('Cart delete result:', result);
                                            if (result.error) {
                                                alert(`Ошибка: ${result.error} (код: ${result.code})`);
                                            } else {
                                                cartButton.classList.remove('cart-active');
                                                const controls = cartButton.querySelector('.cart-controls');
                                                if (controls) controls.remove();
                                                alert(result.message);
                                            }
                                        })
                                        .catch(err => {
                                            console.error('Error removing from cart:', err);
                                            alert('Ошибка при удалении из корзины');
                                        });
                                } else {
                                    console.log(`Adding to cart: productId=${product.id}, userId=${user.id}`);
                                    fetch('/api/cart/add', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ productId: product.id, quantity: 1, userId: user.id }),
                                        credentials: 'include'
                                    })
                                        .then(res => {
                                            console.log('Cart add response:', res.status, res.statusText);
                                            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                                            return res.json();
                                        })
                                        .then(result => {
                                            console.log('Cart add result:', result);
                                            if (result.error) {
                                                alert(`Ошибка: ${result.error} (код: ${result.code})`);
                                            } else {
                                                cartButton.classList.add('cart-active');
                                                cartButton.innerHTML = `
                                                    <div class="cart-controls">
                                                        <button class="cart-decrement">-</button>
                                                        <span class="cart-quantity">${result.quantity}</span>
                                                        <button class="cart-increment">+</button>
                                                    </div>
                                                `;
                                                // alert(result.message);
                                                addCartControls(cartButton, product.id, user);
                                            }
                                        })
                                        .catch(err => {
                                            console.error('Error adding to cart:', err);
                                            alert('Ошибка при добавлении в корзину');
                                        });
                                }
                            });

                            function addCartControls(cartButton, productId, user) {
                                const incrementButton = cartButton.querySelector('.cart-increment');
                                const decrementButton = cartButton.querySelector('.cart-decrement');
                                const quantitySpan = cartButton.querySelector('.cart-quantity');

                                incrementButton.addEventListener('click', () => {
                                    const currentQuantity = parseInt(quantitySpan.textContent);
                                    console.log(`Increasing cart quantity: productId=${productId}, newQuantity=${currentQuantity + 1}`);
                                    fetch(`/api/cart/${productId}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ quantity: currentQuantity + 1, userId: user.id }),
                                        credentials: 'include'
                                    })
                                        .then(res => {
                                            console.log('Cart increment response:', res.status, res.statusText);
                                            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                                            return res.json();
                                        })
                                        .then(result => {
                                            console.log('Cart increment result:', result);
                                            if (result.error) {
                                                alert(`Ошибка: ${result.error} (код: ${result.code})`);
                                            } else {
                                                quantitySpan.textContent = result.quantity;
                                                // alert(result.message);
                                            }
                                        })
                                        .catch(err => {
                                            console.error('Error incrementing cart:', err);
                                            alert('Ошибка при обновлении количества');
                                        });
                                });

                                decrementButton.addEventListener('click', () => {
                                    const currentQuantity = parseInt(quantitySpan.textContent);
                                    if (currentQuantity <= 1) {
                                        console.log(`Removing from cart (decrement): productId=${productId}`);
                                        fetch(`/api/cart/${productId}`, {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ userId: user.id }),
                                            credentials: 'include'
                                        })
                                            .then(res => {
                                                console.log('Cart delete response:', res.status, res.statusText);
                                                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                                                return res.json();
                                            })
                                            .then(result => {
                                                console.log('Cart delete result:', result);
                                                if (result.error) {
                                                    alert(`Ошибка: ${result.error} (код: ${result.code})`);
                                                } else {
                                                    cartButton.classList.remove('cart-active');
                                                    const controls = cartButton.querySelector('.cart-controls');
                                                    if (controls) controls.remove();
                                                    // alert(result.message);
                                                }
                                            })
                                            .catch(err => {
                                                console.error('Error removing from cart:', err);
                                                alert('Ошибка при удалении из корзины');
                                            });
                                    } else {
                                        console.log(`Decreasing cart quantity: productId=${productId}, newQuantity=${currentQuantity - 1}`);
                                        fetch(`/api/cart/${productId}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ quantity: currentQuantity - 1, userId: user.id }),
                                            credentials: 'include'
                                        })
                                            .then(res => {
                                                console.log('Cart decrement response:', res.status, res.statusText);
                                                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                                                return res.json();
                                            })
                                            .then(result => {
                                                console.log('Cart decrement result:', result);
                                                if (result.error) {
                                                    alert(`Ошибка: ${result.error} (код: ${result.code})`);
                                                } else {
                                                    quantitySpan.textContent = result.quantity;
                                                    // alert(result.message);
                                                }
                                            })
                                            .catch(err => {
                                                console.error('Error decrementing cart:', err);
                                                alert('Ошибка при обновлении количества');
                                            });
                                    }
                                });
                            }

                            if (isInCart) {
                                addCartControls(cartButton, product.id, user);
                            }

                            container.appendChild(card);
                        });

                        document.querySelectorAll('.buttonPereyti').forEach(button => {
                            button.addEventListener('click', () => {
                                const productId = button.dataset.productId;
                                window.location.href = `/product/${productId}`;
                            });
                        });

                        toggleLoadingOverlay(false);
                        isLoading = false;
                    })
                    .catch(err => {
                        console.error('Error loading data:', err);
                        container.innerHTML = '<p>Ошибка загрузки продуктов</p>';
                        productsHeader.textContent = 'Товары (0)';
                        toggleLoadingOverlay(false);
                        isLoading = false;
                    });
            })
            .catch(err => {
                console.error('Error checking auth status:', err);
                container.innerHTML = '<p>Ошибка проверки авторизации</p>';
                productsHeader.textContent = 'Товары (0)';
                toggleLoadingOverlay(false);
                isLoading = false;
            });
    }, 300);
});