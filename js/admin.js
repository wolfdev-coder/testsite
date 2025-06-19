const tableFields = {
  users: ['id', 'username', 'email', 'role'],
  products: ['id', 'name', 'miscellaneous', 'price', 'lastPrice', 'imageLogo', 'firmName', 'soldQuantity', 'manufacturingYear'],
  reviews: ['id', 'productId', 'userId', 'comment'],
  ratings: ['id', 'productId', 'userId', 'rating'],
  favorites: ['id', 'userId', 'productId'],
  cart: ['id', 'userId', 'productId', 'quantity'],
  delivery: ['id', 'userId', 'productId', 'count', 'date', 'time', 'status']
};

const tableSchemas = {
  users: ['id', 'username', 'email', 'password', 'role'],
  products: ['id', 'name', 'miscellaneous', 'price', 'lastPrice', 'imageLogo', 'firmName', 'soldQuantity', 'manufacturingYear'],
  reviews: ['id', 'productId', 'userId', 'comment'],
  ratings: ['id', 'productId', 'userId', 'rating'],
  favorites: ['id', 'userId', 'productId'],
  cart: ['id', 'userId', 'productId', 'quantity'],
  delivery: ['id', 'userId', 'productId', 'count', 'date', 'time', 'status']
};

const fieldTypes = {
  price: 'number',
  lastPrice: 'number',
  soldQuantity: 'number',
  manufacturingYear: 'number',
  productId: 'number',
  userId: 'number',
  rating: 'number',
  quantity: 'number',
  count: 'number'
};

async function fetchUsersAndProducts() {
  try {
    const [usersRes, productsRes] = await Promise.all([
      fetch('/api/users', { credentials: 'include' }),
      fetch('/api/products', { credentials: 'include' })
    ]);
    const users = await usersRes.json();
    const products = await productsRes.json();
    if (!usersRes.ok) throw new Error(users.error || `HTTP error: ${usersRes.status}`);
    if (!productsRes.ok) throw new Error(products.error || `HTTP error: ${productsRes.status}`);
    return { users, products };
  } catch (err) {
    console.error('Ошибка при загрузке пользователей и продуктов:', err.message);
    return { users: [], products: [] };
  }
}

async function approveDelivery(id) {
  try {
    const response = await fetch(`/api/delivery/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Можно забрать' }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `HTTP error: ${response.status}`);
    }
    fetchTable('delivery');
  } catch (err) {
    console.error(`Ошибка при утверждении доставки ID=${id}:`, err.message);
    const errorElement = document.getElementById('delivery-error');
    if (errorElement) errorElement.textContent = 'Ошибка при утверждении доставки';
  }
}

async function cancelDelivery(id) {
  try {
    const response = await fetch(`/api/delivery/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Отменено' }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `HTTP error: ${response.status}`);
    }
    fetchTable('delivery');
  } catch (err) {
    console.error(`Ошибка при отмене доставки ID=${id}:`, err.message);
    const errorElement = document.getElementById('delivery-error');
    if (errorElement) errorElement.textContent = 'Ошибка при отмене доставки';
  }
}

function fetchTable(table) {
  if (table === 'products') {
    Promise.all([
      fetch(`/api/${table}`, { credentials: 'include' }).then(res => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      }),
      fetch('/api/photos', { credentials: 'include' }).then(res => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
    ])
      .then(([products, photos]) => {
        console.log('Продукты:', products);
        console.log('Фотографии:', photos);
        const tbody = document.getElementById(`${table}-table`)?.querySelector('tbody');
        if (!tbody) {
          console.error(`Таблица ${table}-table не найдена`);
          return;
        }
        tbody.innerHTML = '';
        if (!products || products.length === 0) {
          tbody.innerHTML = `<tr><td colspan="${tableFields[table].length + 2}">Нет записей</td></tr>`;
          return;
        }
        products.forEach(row => {
          const tr = document.createElement('tr');
          tableFields[table].forEach(field => {
            const td = document.createElement('td');
            if (field === 'imageLogo' && row[field]) {
              const img = document.createElement('img');
              img.src = `data:image/jpeg;base64,${row[field]}`;
              img.style.maxWidth = '100px';
              td.appendChild(img);
            } else {
              td.textContent = row[field] !== null && row[field] !== undefined ? row[field] : '';
            }
            tr.appendChild(td);
          });
          const photosTd = document.createElement('td');
          const productPhotos = photos.filter(photo => photo.productId === row.id);
          if (productPhotos.length > 0) {
            productPhotos.forEach(photo => {
              const img = document.createElement('img');
              img.src = `data:image/jpeg;base64,${photo.image}`;
              img.style.maxWidth = '100px';
              img.style.marginRight = '5px';
              photosTd.appendChild(img);
            });
          } else {
            photosTd.textContent = 'Нет фотографий';
          }
          tr.appendChild(photosTd);
          const actionsTd = document.createElement('td');
          actionsTd.innerHTML = `
            <button onclick="openEditModal('${table}', ${row.id})">Редактировать</button>
            <button onclick="deleteRow('${table}', ${row.id})">Удалить</button>
          `;
          tr.appendChild(actionsTd);
          tbody.appendChild(tr);
        });
      })
      .catch(err => {
        console.error(`Ошибка при загрузке ${table}:`, err.message);
        const errorElement = document.getElementById(`${table}-error`);
        if (errorElement) errorElement.textContent = 'Ошибка загрузки данных';
      });
  } else {
    const apiPath = table === 'favorites' ? '/api/favoritesAdmin' : table === 'cart' ? '/api/cartAdmin' : `/api/${table}`;
    fetch(apiPath, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log(`${table} data:`, data);
        const tbody = document.getElementById(`${table}-table`)?.querySelector('tbody');
        if (!tbody) {
          console.error(`Таблица ${table}-table не найдена`);
          return;
        }
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
          console.log(`No data for ${table}`);
          tbody.innerHTML = `<tr><td colspan="${tableFields[table].length + 1}">Нет записей</td></tr>`;
          return;
        }
        data.forEach(row => {
          console.log(`Row for ${table}:`, row);
          const tr = document.createElement('tr');
          tableFields[table].forEach(field => {
            const td = document.createElement('td');
            td.textContent = row[field] !== null && row[field] !== undefined ? row[field] : '';
            tr.appendChild(td);
          });
          const actionsTd = document.createElement('td');
          let actionsHtml = `
            <button onclick="openEditModal('${table}', ${row.id})">Редактировать</button>
            <button onclick="deleteRow('${table}', ${row.id})">Удалить</button>
          `;
          if (table === 'delivery' && row.status === 'Подготавливается') {
            actionsHtml += `
              <button onclick="approveDelivery(${row.id})">Утвердить доставку</button>
              <button onclick="cancelDelivery(${row.id})">Отменить</button>
            `;
          }
          actionsTd.innerHTML = actionsHtml;
          tr.appendChild(actionsTd);
          tbody.appendChild(tr);
        });
      })
      .catch(err => {
        console.error(`Ошибка при загрузке ${table}:`, err.message);
        const errorElement = document.getElementById(`${table}-error`);
        if (errorElement) errorElement.textContent = 'Ошибка загрузки данных';
      });
  }
}

function deleteRow(table, id) {
  if (!confirm('Удалить запись?')) return;
  const apiPath = table === 'favorites' ? '/api/favoritesAdmin' : table === 'cart' ? '/api/cartAdmin' : `/api/${table}`;
  fetch(`${apiPath}/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        const errorElement = document.getElementById(`${table}-error`);
        if (errorElement) errorElement.textContent = data.error;
      } else {
        fetchTable(table);
      }
    })
    .catch(err => {
      console.error(`Ошибка при удалении ${table}:`, err.message);
      const errorElement = document.getElementById(`${table}-error`);
      if (errorElement) errorElement.textContent = 'Ошибка при удалении';
    });
}

// Утилита для экранирования HTML для защиты от XSS
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function openEditModal(table, id) {
  const modal = document.getElementById('add-modal');
  const modalContent = document.getElementById('modal-form-content');
  if (!modal || !modalContent) {
    console.error('Модальное окно или modal-form-content не найдены');
    return;
  }
  modalContent.innerHTML = `<h3>Редактировать ${escapeHTML(table)} ID=${id}</h3>`;
  const form = document.createElement('form');
  form.id = `${table}-edit-modal-form`;

  try {
    const apiPath = table === 'favorites' ? '/api/favoritesAdmin' : table === 'cart' ? '/api/cartAdmin' : `/api/${table}`;
    console.log(`Запрос данных для ${table} ID=${id} по пути: ${apiPath}`);

    if (table === 'products') {
      form.enctype = 'multipart/form-data';
      const [dataRes, photosRes] = await Promise.all([
        fetch(`${apiPath}/${id}`, { credentials: 'include' }).then(res => res.json()),
        fetch('/api/photos', { credentials: 'include' }).then(res => res.json()),
      ]);
      console.log('Ответ для products:', { data: dataRes, photos: photosRes });

      if (dataRes.error) {
        console.error(`Ошибка API для ${table}:`, dataRes.error);
        const errorElement = document.getElementById(`${table}-error`);
        if (errorElement) errorElement.textContent = dataRes.error;
        return;
      }

      const data = dataRes;
      const photos = photosRes;
      const fields = tableSchemas[table];
      console.log(`Данные для ${table} ID=${id}:`, data);

      fields.forEach(field => {
        if (field === 'id') return;
        if (field === 'imageLogo') {
          const label = document.createElement('label');
          label.setAttribute('for', `edit-${field}`);
          label.textContent = 'Логотип:';
          form.appendChild(label);

          const input = document.createElement('input');
          input.type = 'file';
          input.id = `edit-${field}`;
          input.name = 'imageLogo';
          input.accept = 'image/jpeg,image/png';
          form.appendChild(input);
          if (data[field]) {
            const currentImg = document.createElement('img');
            currentImg.src = `data:image/jpeg;base64,${data[field]}`;
            currentImg.style.maxWidth = '100px';
            form.appendChild(currentImg);
          }
        } else {
          const label = document.createElement('label');
          label.setAttribute('for', `edit-${field}`);

          const input = document.createElement('input');
          input.type = fieldTypes[field] || 'text';
          input.id = `edit-${field}`;

          if (field === 'name') {
            label.textContent = 'Название:';
            input.placeholder = 'Название';
          } else if (field === 'miscellaneous') {
            label.textContent = 'Описание:';
            input.placeholder = 'Описание';
          } else if (field === 'price') {
            label.textContent = 'Цена:';
            input.placeholder = 'Цена';
          } else if (field === 'lastPrice') {
            label.textContent = 'Старая цена:';
            input.placeholder = 'Старая цена';
          } else if (field === 'firmName') {
            label.textContent = 'Производитель:';
            input.placeholder = 'Производитель';
          } else if (field === 'soldQuantity') {
            label.textContent = 'Продано:';
            input.placeholder = 'Продано';
          } else if (field === 'manufacturingYear') {
            label.textContent = 'Год выпуска:';
            input.placeholder = 'Год выпуска';
          }

          input.value = data[field] != null ? escapeHTML(String(data[field])) : '';
          if (['price', 'lastPrice'].includes(field)) {
            input.step = '0.01';
          } else if (['soldQuantity', 'manufacturingYear'].includes(field)) {
            input.min = '0';
          }
          form.appendChild(label);
          form.appendChild(input);
        }
      });

      const photosLabel = document.createElement('label');
      photosLabel.setAttribute('for', 'edit-photos');
      photosLabel.textContent = 'Фотографии:';
      form.appendChild(photosLabel);

      const photosInput = document.createElement('input');
      photosInput.type = 'file';
      photosInput.id = 'edit-photos';
      photosInput.name = 'photos';
      photosInput.accept = 'image/jpeg,image/png';
      photosInput.multiple = true;
      form.appendChild(photosInput);

      const currentPhotos = photos.filter(photo => photo.productId === id);
      if (currentPhotos.length > 0) {
        const photosDiv = document.createElement('div');
        photosDiv.innerHTML = '<h4>Текущие фотографии:</h4>';
        currentPhotos.forEach(photo => {
          const img = document.createElement('img');
          img.src = `data:image/jpeg;base64,${photo.image}`;
          img.style.maxWidth = '100px';
          img.style.marginRight = '5px';
          photosDiv.appendChild(img);
        });
        form.appendChild(photosDiv);
      }

      form.innerHTML += `
        <div id="modal-error" class="error"></div>
        <button type="submit">Сохранить</button>
        <button type="button" onclick="closeAddModal()">Отмена</button>
      `;
      form.onsubmit = async e => {
        e.preventDefault();
        const modalError = document.getElementById('modal-error');
        const formData = new FormData();
        fields.forEach(field => {
          if (field === 'id') return;
          if (field === 'imageLogo') {
            const fileInput = document.getElementById(`edit-${field}`);
            if (fileInput.files.length > 0) {
              formData.append('imageLogo', fileInput.files[0]);
            }
          } else {
            const value = document.getElementById(`edit-${field}`).value;
            formData.append(field, ['soldQuantity', 'manufacturingYear'].includes(field)
              ? parseInt(value) || null
              : ['price', 'lastPrice'].includes(field)
              ? parseFloat(value) || null
              : value || null);
          }
        });
        const photosInput = document.getElementById('edit-photos');
        if (photosInput.files.length > 0) {
          if (photosInput.files.length > 5) {
            modalError.textContent = 'Максимум 5 фотографий';
            return;
          }
          for (let i = 0; i < photosInput.files.length; i++) {
            formData.append('photos', photosInput.files[i]);
          }
        }
        try {
          const res = await fetch(`/api/${table}/${id}`, {
            method: 'PUT',
            body: formData,
            credentials: 'include'
          });
          const data = await res.json();
          if (data.error) {
            modalError.textContent = data.error;
          } else {
            fetchTable(table);
            closeAddModal();
          }
        } catch (err) {
          console.error(`Ошибка при обновлении ${table}:`, err.message);
          modalError.textContent = 'Ошибка при сохранении';
        }
      };
    } else {
      const [dataRes, { users, products }] = await Promise.all([
        fetch(`${apiPath}/${id}`, { credentials: 'include' }).then(res => res.json()),
        fetchUsersAndProducts()
      ]);
      console.log('Ответ для', table, ':', { data: dataRes, users, products });

      if (dataRes.error) {
        console.error(`Ошибка API для ${table}:`, dataRes.error);
        const errorElement = document.getElementById(`${table}-error`);
        if (errorElement) errorElement.textContent = dataRes.error;
        return;
      }

      const data = dataRes;
      const fields = tableSchemas[table];
      console.log(`Данные для ${table} ID=${id}:`, data);

      if (['reviews', 'ratings', 'favorites', 'cart', 'delivery'].includes(table)) {
        const userLabel = document.createElement('label');
        userLabel.setAttribute('for', 'edit-userId');
        userLabel.textContent = 'Пользователь:';
        form.appendChild(userLabel);

        const userSelect = document.createElement('select');
        userSelect.id = 'edit-userId';
        userSelect.innerHTML = `
          <option value="">Выберите пользователя</option>
          ${users.map(user => `<option value="${user.id}" ${data.userId === user.id ? 'selected' : ''}>${escapeHTML(user.username)} (ID: ${user.id})</option>`).join('')}
        `;
        form.appendChild(userSelect);

        const productLabel = document.createElement('label');
        productLabel.setAttribute('for', 'edit-productId');
        productLabel.textContent = 'Продукт:';
        form.appendChild(productLabel);

        const productSelect = document.createElement('select');
        productSelect.id = 'edit-productId';
        productSelect.innerHTML = `
          <option value="">Выберите продукт</option>
          ${products.map(product => `<option value="${product.id}" ${data.productId === product.id ? 'selected' : ''}>${escapeHTML(product.name)} (ID: ${product.id})</option>`).join('')}
        `;
        form.appendChild(productSelect);

        if (table === 'reviews') {
          const commentLabel = document.createElement('label');
          commentLabel.setAttribute('for', 'edit-comment');
          commentLabel.textContent = 'Комментарий:';
          form.appendChild(commentLabel);

          const input = document.createElement('input');
          input.type = 'text';
          input.id = 'edit-comment';
          input.placeholder = 'Комментарий';
          input.value = data.comment != null ? escapeHTML(String(data.comment)) : '';
          form.appendChild(input);
        } else if (table === 'ratings') {
          const ratingLabel = document.createElement('label');
          ratingLabel.setAttribute('for', 'edit-rating');
          ratingLabel.textContent = 'Оценка:';
          form.appendChild(ratingLabel);

          const input = document.createElement('input');
          input.type = 'number';
          input.id = 'edit-rating';
          input.placeholder = 'Оценка';
          input.value = data.rating != null ? escapeHTML(String(data.rating)) : '';
          input.min = '1';
          input.max = '5';
          form.appendChild(input);
        } else if (table === 'cart') {
          const quantityLabel = document.createElement('label');
          quantityLabel.setAttribute('for', 'edit-quantity');
          quantityLabel.textContent = 'Количество:';
          form.appendChild(quantityLabel);

          const input = document.createElement('input');
          input.type = 'number';
          input.id = 'edit-quantity';
          input.placeholder = 'Количество';
          input.value = data.quantity != null ? escapeHTML(String(data.quantity)) : '';
          input.min = '1';
          form.appendChild(input);
        } else if (table === 'delivery') {
          const countLabel = document.createElement('label');
          countLabel.setAttribute('for', 'edit-count');
          countLabel.textContent = 'Количество:';
          form.appendChild(countLabel);

          const countInput = document.createElement('input');
          countInput.type = 'number';
          countInput.id = 'edit-count';
          countInput.placeholder = 'Количество';
          countInput.value = data.count != null ? escapeHTML(String(data.count)) : '';
          countInput.min = '1';
          form.appendChild(countInput);

          const dateLabel = document.createElement('label');
          dateLabel.setAttribute('for', 'edit-date');
          dateLabel.textContent = 'Дата:';
          form.appendChild(dateLabel);

          const dateInput = document.createElement('input');
          dateInput.type = 'date';
          dateInput.id = 'edit-date';
          dateInput.placeholder = 'Дата';
          dateInput.value = data.date != null ? escapeHTML(String(data.date)) : '';
          form.appendChild(dateInput);

          const timeLabel = document.createElement('label');
          timeLabel.setAttribute('for', 'edit-time');
          timeLabel.textContent = 'Время:';
          form.appendChild(timeLabel);

          const timeInput = document.createElement('input');
          timeInput.type = 'time';
          timeInput.id = 'edit-time';
          timeInput.placeholder = 'Время';
          timeInput.value = data.time != null ? escapeHTML(String(data.time)) : '';
          form.appendChild(timeInput);

          const statusLabel = document.createElement('label');
          statusLabel.setAttribute('for', 'edit-status');
          statusLabel.textContent = 'Статус:';
          form.appendChild(statusLabel);

          const statusInput = document.createElement('input');
          statusInput.type = 'text';
          statusInput.id = 'edit-status';
          statusInput.placeholder = 'Статус';
          statusInput.value = data.status != null ? escapeHTML(String(data.status)) : '';
          form.appendChild(statusInput);
        }
      } else {
        fields.forEach(field => {
          if (field === 'id' || (table === 'users' && field === 'password')) return;
          if (table === 'users' && field === 'role') {
            const label = document.createElement('label');
            label.setAttribute('for', `edit-${field}`);
            label.textContent = 'Роль:';
            form.appendChild(label);

            const select = document.createElement('select');
            select.id = `edit-${field}`;
            select.innerHTML = `
              <option value="user" ${data[field] === 'user' ? 'selected' : ''}>Пользователь</option>
              <option value="admin" ${data[field] === 'admin' ? 'selected' : ''}>Администратор</option>
            `;
            form.appendChild(select);
          } else if (table === 'users' && field === 'username') {
            const label = document.createElement('label');
            label.setAttribute('for', `edit-${field}`);
            label.textContent = 'Имя пользователя:';
            form.appendChild(label);

            const input = document.createElement('input');
            input.type = 'text';
            input.id = `edit-${field}`;
            input.placeholder = 'Имя пользователя';
            input.value = data[field] != null ? escapeHTML(String(data[field])) : '';
            form.appendChild(input);
          } else if (table === 'users' && field === 'email') {
            const label = document.createElement('label');
            label.setAttribute('for', `edit-${field}`);
            label.textContent = 'Email:';
            form.appendChild(label);

            const input = document.createElement('input');
            input.type = 'email';
            input.id = `edit-${field}`;
            input.placeholder = 'Email';
            input.value = data[field] != null ? escapeHTML(String(data[field])) : '';
            form.appendChild(input);
          }
        });
      }

      form.innerHTML += `
        <div id="modal-error" class="error"></div>
        <button type="submit">Сохранить</button>
        <button type="button" onclick="closeAddModal()">Отмена</button>
      `;
      form.onsubmit = async e => {
        e.preventDefault();
        const modalError = document.getElementById('modal-error');
        const updatedData = {};
        if (['reviews', 'ratings', 'favorites', 'cart', 'delivery'].includes(table)) {
          updatedData.userId = parseInt(document.getElementById('edit-userId').value) || null;
          updatedData.productId = parseInt(document.getElementById('edit-productId').value) || null;
          if (table === 'reviews') {
            updatedData.comment = document.getElementById('edit-comment').value || null;
          } else if (table === 'ratings') {
            updatedData.rating = parseInt(document.getElementById('edit-rating').value) || null;
            if (isNaN(updatedData.rating) || updatedData.rating < 1 || updatedData.rating > 5) {
              modalError.textContent = 'Оценка должна быть от 1 до 5';
              return;
            }
          } else if (table === 'cart') {
            updatedData.quantity = parseInt(document.getElementById('edit-quantity').value) || null;
            if (isNaN(updatedData.quantity) || updatedData.quantity < 1) {
              modalError.textContent = 'Количество должно быть больше 0';
              return;
            }
          } else if (table === 'delivery') {
            updatedData.count = parseInt(document.getElementById('edit-count').value) || null;
            updatedData.date = document.getElementById('edit-date').value || null;
            updatedData.time = document.getElementById('edit-time').value || null;
            updatedData.status = document.getElementById('edit-status').value || null;
            if (isNaN(updatedData.count) || updatedData.count < 1) {
              modalError.textContent = 'Количество должно быть больше 0';
              return;
            }
            if (!updatedData.date) {
              modalError.textContent = 'Дата обязательна';
              return;
            }
          }
        } else if (table !== 'products') {
          fields.forEach(field => {
            if (field === 'id' || (table === 'users' && field === 'password')) return;
            const input = document.getElementById(`edit-${field}`);
            if (input) {
              updatedData[field] = ['soldQuantity', 'manufacturingYear'].includes(field)
                ? parseInt(input.value) || null
                : ['price', 'lastPrice'].includes(field)
                ? parseFloat(input.value) || null
                : input.value || null;
            }
          });
        }
        console.log(`Отправка обновленных данных для ${table}:`, updatedData);
        try {
          const response = await fetch(`${apiPath}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData),
            credentials: 'include'
          });
          const data = await response.json();
          if (data.error) {
            modalError.textContent = data.error;
          } else {
            fetchTable(table);
            closeAddModal();
          }
        } catch (err) {
          console.error(`Ошибка при обновлении ${table}:`, err.message);
          modalError.textContent = 'Ошибка при сохранении';
        }
      };
    }

    modalContent.appendChild(form);
    modal.style.display = 'flex';
  } catch (err) {
    console.error(`Ошибка при загрузке ${table} ID=${id}:`, err.message);
    const errorElement = document.getElementById(`${table}-error`);
    if (errorElement) errorElement.textContent = 'Ошибка при загрузке записи';
  }
}

function clearError(errorId) {
  const errorElement = document.getElementById(errorId);
  if (errorElement) errorElement.textContent = '';
}

async function openAddModal(table) {
  const modal = document.getElementById('add-modal');
  const modalContent = document.getElementById('modal-form-content');
  modalContent.innerHTML = `<h3>Добавить ${table}</h3>`;
  const form = document.createElement('form');
  form.id = `${table}-modal-form`;

  if (table === 'products') {
    form.enctype = 'multipart/form-data';
  }

  if (table === 'users') {
    form.innerHTML = `
      <label for="username">Имя:</label>
      <input type="text" id="username" placeholder="Имя" required>

      <label for="email">Email:</label>
      <input type="email" id="email" placeholder="Email" required>

      <label for="password">Пароль:</label>
      <input type="password" id="password" placeholder="Пароль" required minlength="8">

      <label for="role">Роль:</label>
      <select id="role">
        <option value="user">Пользователь</option>
        <option value="admin">Администратор</option>
      </select>

      <div id="modal-error" class="error"></div>
      <button type="submit">Добавить</button>
    `;
    form.onsubmit = e => handleUserSubmit(e, table);
  } else if (table === 'products') {
    form.innerHTML = `
      <label for="name">Название:</label>
      <input type="text" id="name" placeholder="Название" required>

      <label for="miscellaneous">Описание:</label>
      <input type="text" id="miscellaneous" placeholder="Описание">

      <label for="price">Цена:</label>
      <input type="number" id="price" placeholder="Цена" required min="0" step="0.01">

      <label for="lastPrice">Старая цена:</label>
      <input type="number" id="lastPrice" placeholder="Старая цена" min="0" step="0.01">

      <label for="imageLogo">Логотип:</label>
      <input type="file" id="imageLogo" name="imageLogo" accept="image/jpeg,image/png">

      <label for="firmName">Производитель:</label>
      <input type="text" id="firmName" placeholder="Производитель">

      <label for="soldQuantity">Продано:</label>
      <input type="number" id="soldQuantity" placeholder="Продано" min="0">

      <label for="manufacturingYear">Год выпуска:</label>
      <input type="number" id="manufacturingYear" placeholder="Год выпуска" min="1900" max="2025">

      <label for="photos">Фотографии:</label>
      <input type="file" id="photos" name="photos" accept="image/jpeg,image/png" multiple>

      <div id="modal-error" class="error"></div>
      <button type="submit">Добавить</button>
    `;
    form.onsubmit = e => handleProductSubmit(e, table);
  } else if (table === 'reviews') {
    const { users, products } = await fetchUsersAndProducts();
    form.innerHTML = `
      <label for="review-userId">Пользователь:</label>
      <select id="review-userId" required>
        <option value="">Выберите пользователя</option>
        ${users.map(user => `<option value="${user.id}">${user.username} (ID: ${user.id})</option>`).join('')}
      </select>

      <label for="review-productId">Продукт:</label>
      <select id="review-productId" required>
        <option value="">Выберите продукт</option>
        ${products.map(product => `<option value="${product.id}">${product.name} (ID: ${product.id})</option>`).join('')}
      </select>

      <label for="review-comment">Комментарий:</label>
      <input type="text" id="review-comment" placeholder="Комментарий" required>

      <div id="modal-error" class="error"></div>
      <button type="submit">Добавить</button>
    `;
    form.onsubmit = e => handleReviewSubmit(e, table);
  } else if (table === 'ratings') {
    const { users, products } = await fetchUsersAndProducts();
    form.innerHTML = `
      <label for="rating-userId">Пользователь:</label>
      <select id="rating-userId" required>
        <option value="">Выберите пользователя</option>
        ${users.map(user => `<option value="${user.id}">${user.username} (ID: ${user.id})</option>`).join('')}
      </select>

      <label for="rating-productId">Продукт:</label>
      <select id="rating-productId" required>
        <option value="">Выберите продукт</option>
        ${products.map(product => `<option value="${product.id}">${product.name} (ID: ${product.id})</option>`).join('')}
      </select>

      <label for="rating-value">Оценка:</label>
      <input type="number" id="rating-value" placeholder="Оценка (1–5)" required min="1" max="5">

      <div id="modal-error" class="error"></div>
      <button type="submit">Добавить</button>
    `;
    form.onsubmit = e => handleRatingSubmit(e, table);
  } else if (table === 'favorites') {
    const { users, products } = await fetchUsersAndProducts();
    form.innerHTML = `
      <label for="favorite-userId">Пользователь:</label>
      <select id="favorite-userId" required>
        <option value="">Выберите пользователя</option>
        ${users.map(user => `<option value="${user.id}">${user.username} (ID: ${user.id})</option>`).join('')}
      </select>

      <label for="favorite-productId">Продукт:</label>
      <select id="favorite-productId" required>
        <option value="">Выберите продукт</option>
        ${products.map(product => `<option value="${product.id}">${product.name} (ID: ${product.id})</option>`).join('')}
      </select>

      <div id="modal-error" class="error"></div>
      <button type="submit">Добавить</button>
    `;
    form.onsubmit = e => handleFavoriteSubmit(e, table);
  } else if (table === 'cart') {
    const { users, products } = await fetchUsersAndProducts();
    form.innerHTML = `
      <label for="cart-userId">Пользователь:</label>
      <select id="cart-userId" required>
        <option value="">Выберите пользователя</option>
        ${users.map(user => `<option value="${user.id}">${user.username} (ID: ${user.id})</option>`).join('')}
      </select>

      <label for="cart-productId">Продукт:</label>
      <select id="cart-productId" required>
        <option value="">Выберите продукт</option>
        ${products.map(product => `<option value="${product.id}">${product.name} (ID: ${product.id})</option>`).join('')}
      </select>

      <label for="cart-quantity">Количество:</label>
      <input type="number" id="cart-quantity" placeholder="Количество" required min="1">

      <div id="modal-error" class="error"></div>
      <button type="submit">Добавить</button>
    `;
    form.onsubmit = e => handleCartSubmit(e, table);
  } else if (table === 'delivery') {
    const { users, products } = await fetchUsersAndProducts();
    form.innerHTML = `
      <label for="delivery-userId">Пользователь:</label>
      <select id="delivery-userId" required>
        <option value="">Выберите пользователя</option>
        ${users.map(user => `<option value="${user.id}">${user.username} (ID: ${user.id})</option>`).join('')}
      </select>

      <label for="delivery-productId">Продукт:</label>
      <select id="delivery-productId" required>
        <option value="">Выберите продукт</option>
        ${products.map(product => `<option value="${product.id}">${product.name} (ID: ${product.id})</option>`).join('')}
      </select>

      <label for="delivery-count">Количество:</label>
      <input type="number" id="delivery-count" placeholder="Количество" required min="1">

      <label for="delivery-date">Дата:</label>
      <input type="date" id="delivery-date" required>

      <label for="delivery-time">Время:</label>
      <input type="time" id="delivery-time" placeholder="Время">

      <label for="delivery-status">Статус:</label>
      <input type="text" id="delivery-status" placeholder="Статус">

      <div id="modal-error" class="error"></div>
      <button type="submit">Добавить</button>
    `;
    form.onsubmit = e => handleDeliverySubmit(e, table);
  }

  modalContent.appendChild(form);
  modal.style.display = 'flex';
}

function closeAddModal() {
  const modal = document.getElementById('add-modal');
  const modalContent = document.getElementById('modal-form-content');
  modal.style.display = 'none';
  modalContent.innerHTML = '';
}

async function handleUserSubmit(e, table) {
  e.preventDefault();
  clearError(`${table}-error`);
  const modalError = document.getElementById('modal-error');
  const data = {
    username: document.getElementById('username').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    role: document.getElementById('role').value
  };
  if (data.password.length < 8) {
    modalError.textContent = 'Пароль должен содержать минимум 8 символов';
    return;
  }
  if (!data.username || !data.email) {
    modalError.textContent = 'Имя и email обязательны';
    return;
  }
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    const result = await res.json();
    if (result.error) {
      modalError.textContent = result.error;
    } else {
      fetchTable(table);
      closeAddModal();
    }
  } catch (err) {
    console.error('Ошибка при добавлении пользователя:', err.message);
    modalError.textContent = 'Ошибка при добавлении';
  }
}

async function handleProductSubmit(e, table) {
  e.preventDefault();
  clearError(`${table}-error`);
  const modalError = document.getElementById('modal-error');
  const formData = new FormData();
  formData.append('name', document.getElementById('name').value.trim());
  formData.append('miscellaneous', document.getElementById('miscellaneous').value.trim() || '');
  formData.append('price', parseFloat(document.getElementById('price').value) || 0);
  formData.append('lastPrice', parseFloat(document.getElementById('lastPrice').value) || null);
  formData.append('firmName', document.getElementById('firmName').value.trim() || '');
  formData.append('soldQuantity', parseInt(document.getElementById('soldQuantity').value) || 0);
  formData.append('manufacturingYear', parseInt(document.getElementById('manufacturingYear').value) || null);
  const imageLogoInput = document.getElementById('imageLogo');
  if (imageLogoInput.files.length > 0) {
    formData.append('imageLogo', imageLogoInput.files[0]);
  }
  const photosInput = document.getElementById('photos');
  if (photosInput.files.length > 0) {
    if (photosInput.files.length > 5) {
      modalError.textContent = 'Максимум 5 фотографий';
      return;
    }
    for (let i = 0; i < photosInput.files.length; i++) {
      formData.append('photos', photosInput.files[i]);
    }
  }
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    const result = await res.json();
    if (result.error) {
      modalError.textContent = result.error;
    } else {
      fetchTable(table);
      closeAddModal();
    }
  } catch (err) {
    console.error('Ошибка при добавлении продукта:', err.message);
    modalError.textContent = 'Ошибка при добавлении';
  }
}

async function handleReviewSubmit(e, table) {
  e.preventDefault();
  clearError(`${table}-error`);
  const modalError = document.getElementById('modal-error');
  const userId = parseInt(document.getElementById('review-userId').value);
  const productId = parseInt(document.getElementById('review-productId').value);
  const comment = document.getElementById('review-comment').value.trim();
  console.log('Reviews form data:', { userId, productId, comment });
  if (isNaN(productId) || productId < 1) {
    modalError.textContent = 'Выберите действительный продукт';
    return;
  }
  if (isNaN(userId) || userId < 1) {
    modalError.textContent = 'Выберите действительного пользователя';
    return;
  }
  if (!comment) {
    modalError.textContent = 'Комментарий обязателен';
    return;
  }
  const data = { productId, userId, comment };
  try {
    const res = await fetch('/api/reviews/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    const result = await res.json();
    if (result.error) {
      modalError.textContent = result.error;
    } else {
      fetchTable(table);
      closeAddModal();
    }
  } catch (err) {
    console.error('Ошибка при добавлении отзыва:', err.message);
    modalError.textContent = 'Ошибка при добавлении';
  }
}

async function handleRatingSubmit(e, table) {
  e.preventDefault();
  clearError(`${table}-error`);
  const modalError = document.getElementById('modal-error');
  const userId = parseInt(document.getElementById('rating-userId').value);
  const productId = parseInt(document.getElementById('rating-productId').value);
  const rating = parseInt(document.getElementById('rating-value').value);
  console.log('Ratings form data:', { userId, productId, rating });
  if (isNaN(productId) || productId < 1) {
    modalError.textContent = 'Выберите действительный продукт';
    return;
  }
  if (isNaN(userId) || userId < 1) {
    modalError.textContent = 'Выберите действительного пользователя';
    return;
  }
  if (isNaN(rating) || rating < 1 || rating > 5) {
    modalError.textContent = 'Рейтинг должен быть целым числом от 1 до 5';
    return;
  }
  const data = { productId, userId, rating };
  try {
    const res = await fetch('/api/ratings/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    const result = await res.json();
    if (result.error) {
      modalError.textContent = result.error;
    } else {
      fetchTable(table);
      closeAddModal();
    }
  } catch (err) {
    console.error('Ошибка при добавлении рейтинга:', err.message);
    modalError.textContent = 'Ошибка при добавлении';
  }
}

async function handleFavoriteSubmit(e, table) {
  e.preventDefault();
  clearError(`${table}-error`);
  const modalError = document.getElementById('modal-error');
  const userId = parseInt(document.getElementById('favorite-userId').value);
  const productId = parseInt(document.getElementById('favorite-productId').value);
  console.log('Favorites form data:', { userId, productId });
  if (isNaN(productId) || productId < 1) {
    modalError.textContent = 'Выберите действительный продукт';
    return;
  }
  if (isNaN(userId) || userId < 1) {
    modalError.textContent = 'Выберите действительного пользователя';
    return;
  }
  const data = { userId, productId };
  try {
    const res = await fetch('/api/favoritesAdmin/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    const result = await res.json();
    if (result.error) {
      modalError.textContent = result.error;
    } else {
      fetchTable(table);
      closeAddModal();
    }
  } catch (err) {
    console.error('Ошибка при добавлении в избранное:', err.message);
    modalError.textContent = 'Ошибка при добавлении';
  }
}

async function handleCartSubmit(e, table) {
  e.preventDefault();
  clearError(`${table}-error`);
  const modalError = document.getElementById('modal-error');
  const userId = parseInt(document.getElementById('cart-userId').value);
  const productId = parseInt(document.getElementById('cart-productId').value);
  const quantity = parseInt(document.getElementById('cart-quantity').value);
  console.log('Cart form data:', { userId, productId, quantity });
  if (isNaN(productId) || productId < 1) {
    modalError.textContent = 'Выберите действительный продукт';
    return;
  }
  if (isNaN(userId) || userId < 1) {
    modalError.textContent = 'Выберите действительного пользователя';
    return;
  }
  if (isNaN(quantity) || quantity < 1) {
    modalError.textContent = 'Количество должно быть целым числом больше 0';
    return;
  }
  const data = { userId, productId, quantity };
  try {
    const res = await fetch('/api/cartAdmin/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    const result = await res.json();
    if (result.error) {
      modalError.textContent = result.error;
    } else {
      fetchTable(table);
      closeAddModal();
    }
  } catch (err) {
    console.error('Ошибка при добавлении в корзину:', err.message);
    modalError.textContent = 'Ошибка при добавлении';
  }
}

async function handleDeliverySubmit(e, table) {
  e.preventDefault();
  clearError(`${table}-error`);
  const modalError = document.getElementById('modal-error');
  const userId = parseInt(document.getElementById('delivery-userId').value);
  const productId = parseInt(document.getElementById('delivery-productId').value);
  const count = parseInt(document.getElementById('delivery-count').value);
  const date = document.getElementById('delivery-date').value;
  const time = document.getElementById('delivery-time').value;
  const status = document.getElementById('delivery-status').value;
  console.log('Delivery form data:', { userId, productId, count, date, time, status });
  if (isNaN(productId) || productId < 1) {
    modalError.textContent = 'Выберите действительный продукт';
    return;
  }
  if (isNaN(userId) || userId < 1) {
    modalError.textContent = 'Выберите действительного пользователя';
    return;
  }
  if (isNaN(count) || count < 1) {
    modalError.textContent = 'Количество должно быть целым числом больше 0';
    return;
  }
  if (!date) {
    modalError.textContent = 'Дата обязательна';
    return;
  }
  const data = { userId, productId, count, date, time, status };
  try {
    const res = await fetch('/api/delivery/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    const result = await res.json();
    if (result.error) {
      modalError.textContent = result.error;
    } else {
      fetchTable(table);
      closeAddModal();
    }
  } catch (err) {
    console.error('Ошибка при добавлении доставки:', err.message);
    modalError.textContent = 'Ошибка при добавлении';
  }
}

function initialize() {
  fetch('/auth/status', { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      console.log('Статус авторизации:', data);
      if (!data.isAuthenticated || data.user.role !== 'admin') {
        window.location.href = '/';
      } else {
        fetchTable('users');
        setupTabs();
      }
    })
    .catch(err => {
      console.error('Ошибка проверки авторизации:', err.message);
      window.location.href = '/';
    });

  function setupTabs() {
    const tabs = document.querySelectorAll('.tab-nav');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        fetchTable(tabId);
      });
    });
  }
}

function logout() {
  fetch('/logout', { method: 'POST', credentials: 'include' })
    .then(() => window.location.href = '/')
    .catch(err => console.error('Ошибка при выходе:', err.message));
}

document.addEventListener('DOMContentLoaded', initialize);