document.addEventListener("DOMContentLoaded", () => {
  const userInfoDiv = document.getElementById("user-info");

  if (!userInfoDiv) {
    console.error("Элемент с id='user-info' не найден на странице");
    return;
  }

  // Функция для санитизации HTML
  function sanitizeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  // Загрузка данных пользователя
  async function loadUserData() {
    userInfoDiv.innerHTML = "<p>Загрузка...</p>";
    try {
      console.log("Отправка запроса на /auth/status");
      const response = await fetch("/auth/status", {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      if (!data.isAuthenticated) {
        console.log("Пользователь не авторизован, перенаправление на /login.html");
        window.location.href = "/login.html";
        return null;
      }
      console.log("Получены данные пользователя:", data.user);
      return data.user;
    } catch (err) {
      console.error("Ошибка при получении данных пользователя:", err.message);
      userInfoDiv.innerHTML =
        "<p>Ошибка загрузки данных. Пожалуйста, войдите в систему.</p>";
      setTimeout(() => (window.location.href = "/login.html"), 2000);
      return null;
    }
  }

  // Загрузка избранного
  async function loadFavorites() {
    try {
      const response = await fetch("/api/favorites", {
        credentials: "include",
      });
      const favorites = await response.json();
      if (!response.ok) {
        throw new Error(favorites.error || `HTTP error! status: ${response.status}`);
      }
      const validFavorites = favorites.filter(
        (p) => p.name && typeof p.price === "number"
      );
      console.log("Полученные товары из избранного:", validFavorites);
      return validFavorites;
    } catch (err) {
      console.error("Ошибка при загрузке избранного:", err.message);
      return [];
    }
  }

  // Загрузка корзины
  async function loadCart() {
    try {
      console.log("Отправка запроса на /api/cart");
      const response = await fetch("/api/cart", {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      console.log("Получены данные корзины:", data);
      return data;
    } catch (err) {
      console.error("Ошибка при загрузке корзины:", err.message);
      return [];
    }
  }

  // Загрузка заказов (доставок)
async function loadDeliveries() {
  try {
    console.log("Отправка запроса на /api/delivery");
    const response = await fetch("/api/delivery", {
      credentials: "include",
    });
    const deliveries = await response.json();
    console.log("Полные данные от API /api/delivery:", deliveries); // Лог для отладки
    if (!response.ok) {
      throw new Error(deliveries.error || `HTTP error! status: ${response.status}`);
    }
    return deliveries; // Возвращаем все заказы без фильтрации
  } catch (err) {
    console.error("Ошибка при загрузке заказов:", err.message);
    return [];
  }
}

  // Отрисовка таблицы избранного
  async function renderFavorites(favorites) {
    const favoritesCount = favorites.length;
    if (!favorites || favorites.length === 0) {
      return `
        <div class="section-header">
          <h4>Избранное</h4>
          <p class="item-count">Всего в избранном: <span id="favorites-count">${favoritesCount}</span></p>
        </div>
        <p>Ваше избранное пусто.</p>
      `;
    }
    let html = `
      <div class="section-header">
        <h4>Избранное</h4>
        <p class="item-count">Всего в избранном: <span id="favorites-count">${favoritesCount}</span></p>
      </div>
      <table class="favorites-table">
        <thead>
          <tr>
            <th>Фото</th>
            <th>Название</th>
            <th>Цена</th>
            <th>Производитель</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const item of favorites) {
      const price =
        typeof item.price === "number" && !isNaN(item.price)
          ? item.price.toFixed(2)
          : "N/A";
      const name = item.name || "Неизвестный товар";
      const firmName = item.firmName || "Неизвестный производитель";
      let imageSrc = "/img/placeholder.jpg";

      try {
        const photoResponse = await fetch(`/api/photos?productId=${item.productId}`, {
          credentials: "include",
        });
        const photos = await photoResponse.json();
        if (!photoResponse.ok) {
          throw new Error(
            photos.error || `HTTP error! status: ${photoResponse.status}`
          );
        }
        imageSrc =
          photos.length > 0 && photos[0].image
            ? `data:image/jpeg;base64,${photos[0].image}`
            : "/img/placeholder.jpg";
      } catch (err) {
        console.error(
          `Ошибка при загрузке изображения для продукта ${item.productId}:`,
          err.message
        );
      }

      html += `
        <tr data-product-id="${item.productId}">
          <td><img src="${imageSrc}" alt="${sanitizeHTML(name)}"></td>
          <td>${sanitizeHTML(name)}</td>
          <td>${price} ₽</td>
          <td>${sanitizeHTML(firmName)}</td>
          <td>
            <div class="table-action-buttons">
              <button class="remove-favorite-btn" data-product-id="${item.productId}">Удалить</button>
              <button class="go-to-product-btn" data-product-id="${item.productId}">Перейти</button>
            </div>
          </td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    `;
    return html;
  }

  // Отрисовка таблицы корзины
  async function renderCart(cart) {
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (!cart || cart.length === 0) {
      return `
        <div class="section-header">
          <h4>Корзина</h4>
          <p class="item-count">Всего в корзине: <span id="cart-count">${cartCount}</span></p>
        </div>
        <p>Ваша корзина пуста.</p>
      `;
    }
    let html = `
      <div class="section-header">
        <h4>Корзина</h4>
        <p class="item-count">Всего в корзине: <span id="cart-count">${cartCount}</span></p>
      </div>
      <table class="cart-table">
        <thead>
          <tr>
            <th>Фото</th>
            <th>Название</th>
            <th>Количество</th>
            <th>Цена за единицу</th>
            <th>Общая стоимость</th>
            <th>Изменить количество</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const item of cart) {
      const price =
        typeof item.price === "number" && !isNaN(item.price)
          ? item.price.toFixed(2)
          : "0.00";
      const total =
        typeof item.price === "number" && !isNaN(item.price)
          ? (item.quantity * item.price).toFixed(2)
          : "0.00";
      const name = item.name || "Ошибка загрузки";
      let imageSrc = "/img/placeholder.jpg";

      try {
        const photoResponse = await fetch(`/api/photos?productId=${item.productId}`, {
          credentials: "include",
        });
        const photos = await photoResponse.json();
        if (!photoResponse.ok) {
          throw new Error(
            photos.error || `HTTP error! status: ${photoResponse.status}`
          );
        }
        imageSrc =
          photos.length > 0 && photos[0].image
            ? `data:image/jpeg;base64,${photos[0].image}`
            : "/img/placeholder.jpg";
      } catch (err) {
        console.error(
          `Ошибка при загрузке изображения для продукта ${item.productId}:`,
          err.message
        );
      }

      html += `
        <tr data-product-id="${item.productId}">
          <td><img src="${imageSrc}" alt="${sanitizeHTML(name)}"></td>
          <td>${sanitizeHTML(name)}</td>
          <td class="quantity-display">${item.quantity}</td>
          <td>${price} ₽</td>
          <td>${total} ₽</td>
          <td>
            <button class="increase-qty-btn qty-btn" data-product-id="${item.productId}">+</button>
            <span class="quantity-value">${item.quantity}</span>
            <button class="decrease-qty-btn qty-btn" data-product-id="${item.productId}">−</button>
          </td>
          <td>
            <div class="table-action-buttons">
              <button class="remove-cart-btn" data-product-id="${item.productId}">Удалить</button>
              <button class="go-to-product-btn" data-product-id="${item.productId}">Перейти</button>
            </div>
          </td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    `;
    return html;
  }

// Отрисовка таблицы заказов
async function renderDeliveries(deliveries) {
  const deliveryCount = deliveries.length;
  if (!deliveries || deliveries.length === 0) {
    return `
      <div class="section-header">
        <h4>Заказы</h4>
        <p class="item-count">Всего заказов: <span id="delivery-count">${deliveryCount}</span></p>
      </div>
      <p>У вас нет активных заказов.</p>
    `;
  }
  let html = `
    <div class="section-header">
      <h4>Заказы</h4>
      <p class="item-count">Всего заказов: <span id="delivery-count">${deliveryCount}</span></p>
    </div>
    <table class="delivery-table">
      <thead>
        <tr>
          <th>Фото</th>
          <th>Название</th>
          <th>Количество</th>
          <th>Дата заказа</th>
          <th>Время заказа</th>
          <th>Статус</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const item of deliveries) {
    let name = "Неизвестный товар";
    let imageSrc = "/img/placeholder.jpg";
    const id = item.id || "unknown";
    const productId = item.productId || null;
    const count = item.count || 0;
    const date = item.date || "Не указана";
    const time = item.time || "Не указано";
    const status = item.status != null ? item.status.toString() : "Неизвестен";

    // Determine the CSS class based on status
    let statusClass = '';
    switch (status) {
      case 'Можно забрать':
        statusClass = 'status-can-pickup';
        break;
      case 'Подготавливается':
        statusClass = 'status-preparing';
        break;
      case 'Отменено':
        statusClass = 'status-cancelled';
        break;
      default:
        statusClass = '';
    }

    if (productId) {
      try {
        const productResponse = await fetch(`/api/products/${productId}`, {
          credentials: "include",
        });
        const product = await productResponse.json();
        console.log(`Продукт для productId ${productId}:`, product);
        if (!productResponse.ok) {
          throw new Error(product.error || `HTTP error! status: ${productResponse.status}`);
        }
        name = product.name || "Неизвестный товар";

        const photoResponse = await fetch(`/api/photos?productId=${productId}`, {
          credentials: "include",
        });
        const photos = await photoResponse.json();
        console.log(`Фото для productId ${productId}:`, photos);
        if (!photoResponse.ok) {
          throw new Error(photos.error || `HTTP error! status: ${photoResponse.status}`);
        }
        imageSrc =
          photos.length > 0 && photos[0].image
            ? `data:image/jpeg;base64,${photos[0].image}`
            : "/img/placeholder.jpg";
      } catch (err) {
        console.error(
          `Ошибка при загрузке данных продукта ${productId}:`,
          err.message
        );
      }
    }

    html += `
      <tr data-delivery-id="${id}" class="${statusClass}">
        <td><img src="${imageSrc}" alt="${sanitizeHTML(name)}"></td>
        <td>${sanitizeHTML(name)}</td>
        <td>${count}</td>
        <td>${sanitizeHTML(date)}</td>
        <td>${sanitizeHTML(time)}</td>
        <td>${sanitizeHTML(status)}</td>
        <td>
          <div class="table-action-buttons">
            <button class="go-to-product-btn" data-product-id="${productId || ''}" ${productId ? '' : 'disabled'}>Перейти</button>
          </div>
        </td>
      </tr>
    `;
  }

  html += `
      </tbody>
    </table>
  `;
  return html;
}

  // Загрузка данных о продуктах для корзины
  async function enrichCartWithProductData(cart) {
    const enrichedCart = [];
    for (const item of cart) {
      try {
        const response = await fetch(`/api/products/${item.productId}`, {
          credentials: "include",
        });
        const product = await response.json();
        if (!response.ok) {
          throw new Error(product.error || `HTTP error! status: ${response.status}`);
        }
        enrichedCart.push({
          ...item,
          name: product.name,
          price: product.price,
        });
      } catch (err) {
        console.error(`Ошибка при загрузке данных продукта ${item.productId}:`, err.message);
        enrichedCart.push({
          ...item,
          name: "Ошибка загрузки",
          price: 0,
        });
      }
    }
    return enrichedCart;
  }

  // Функция для отрисовки профиля
  async function renderProfile(user, editable = false) {
    if (!user) {
      console.error("Пользовательские данные отсутствуют");
      userInfoDiv.innerHTML = "<p>Данные пользователя отсутствуют.</p>";
      return;
    }

    // Загрузка избранного, корзины и заказов
    const favorites = await loadFavorites();
    let cart = await loadCart();
    cart = await enrichCartWithProductData(cart);
    const deliveries = await loadDeliveries();

    let htmlContent = `
      <div class="user-card">
        <h3>Добро пожаловать, ${sanitizeHTML(user.username)}!</h3>
    `;

    if (editable) {
      htmlContent += `
        <form id="profile-form" class="user-info">
          <div class="form-group">
            <label for="username">Имя:</label>
            <input type="text" id="username" value="${sanitizeHTML(
              user.username
            )}" required maxlength="50">
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" value="${sanitizeHTML(
              user.email
            )}" required>
          </div>
          <div class="form-group">
            <label for="role">Роль:</label>
            <input type="text" id="role" value="${sanitizeHTML(
              user.role
            )}" disabled>
          </div>
          <div class="form-actions">
            <button type="submit" class="save-btn">Сохранить</button>
            <button type="button" class="cancel-btn">Отмена</button>
          </div>
        </form>
      `;
    } else {
      htmlContent += `
        <div class="user-info">
          <p><strong>Имя:</strong> ${sanitizeHTML(user.username)}</p>
          <p><strong>Email:</strong> ${sanitizeHTML(user.email)}</p>
          <p><strong>Роль:</strong> ${sanitizeHTML(user.role)}</p>
          <div class="action-buttons">
            <button class="edit-profile-btn">Редактировать профиль</button>
            <button class="change-password-btn">Изменить пароль</button>
            <button class="logout-btn">Выйти</button>
          </div>
        </div>
      `;
    }

    htmlContent += `
      <div id="change-password-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close">×</span>
          <h3>Смена пароля</h3>
          <form id="change-password-form">
            <div class="form-group">
              <label for="password">Текущий пароль:</label>
              <input type="password" id="password" required minlength="4" maxlength="50">
            </div>
            <div class="form-group">
              <label for="new-password">Новый пароль:</label>
              <input type="password" id="new-password" required minlength="8" maxlength="50">
            </div>
            <div class="form-group">
              <label for="confirm-password">Подтвердите новый пароль:</label>
              <input type="password" id="confirm-password" required minlength="8" maxlength="50">
            </div>
            <div class="form-actions">
              <button type="submit" class="save-password-btn">Сохранить</button>
              <button type="button" class="cancel-password-btn">Отмена</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Добавление таблиц избранного, корзины и заказов
    htmlContent += await renderFavorites(favorites);
    htmlContent += await renderCart(cart);
    htmlContent += await renderDeliveries(deliveries);

    // Кнопки для "Назад" и "Сделать заказ"
    htmlContent += `
      <div class="back-and-order-buttons" style="margin-top: 20px; text-align: center;">
        <button class="back-btn">← Назад</button>
        <button class="place-order-btn" ${cart.length === 0 ? "disabled" : ""}>Сделать заказ</button>
      </div>
    `;

    htmlContent += "</div>";

    userInfoDiv.innerHTML = htmlContent;

    // --- КНОПКИ УВЕЛИЧЕНИЯ/УМЕНЬШЕНИЯ КОЛИЧЕСТВА ---
    const increaseButtons = userInfoDiv.querySelectorAll(".increase-qty-btn");
    const decreaseButtons = userInfoDiv.querySelectorAll(".decrease-qty-btn");

    increaseButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const productId = parseInt(button.getAttribute("data-product-id"));
        console.log("Попытка увеличить количество:", { productId });

        if (isNaN(productId) || productId < 1) {
          console.error("Неверный productId:", productId);
          alert("Ошибка: неверный идентификатор продукта");
          return;
        }

        const row = button.closest("tr");
        if (!row) {
          console.error("Не найдена строка таблицы для productId:", productId);
          alert("Ошибка: не найдена строка товара");
          return;
        }

        const qtyDisplay = row.querySelector(".quantity-display");
        const qtyValueSpan = row.querySelector(".quantity-value");
        if (!qtyDisplay || !qtyValueSpan) {
          console.error("Не найдены элементы количества для productId:", productId);
          alert("Ошибка: не найдены элементы количества");
          return;
        }

        let currentQty = parseInt(qtyValueSpan.textContent);
        if (isNaN(currentQty)) {
          console.error("Неверное текущее количество:", qtyValueSpan.textContent);
          alert("Ошибка: неверное текущее количество");
          return;
        }

        currentQty += 1;

        try {
          const res = await fetch(`/api/cart/${productId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ quantity: currentQty, userId: user.id }),
          });

          if (!res.ok) {
            const result = await res.json();
            throw new Error(result.error || `Ошибка HTTP: ${res.status}`);
          }

          qtyDisplay.textContent = currentQty.toString();
          qtyValueSpan.textContent = currentQty.toString();

          const priceCell = row.cells[3];
          if (!priceCell) {
            console.error("Не найдена ячейка цены для productId:", productId);
            alert("Ошибка: не найдена цена товара");
            return;
          }
          const price = parseFloat(priceCell.textContent);
          if (isNaN(price)) {
            console.error("Неверная цена:", priceCell.textContent);
            alert("Ошибка: неверная цена товара");
            return;
          }

          const totalCell = row.cells[4];
          if (totalCell) {
            totalCell.textContent = (currentQty * price).toFixed(2) + " ₽";
          } else {
            console.error("Не найдена ячейка общей стоимости для productId:", productId);
          }

          const cartCountSpan = userInfoDiv.querySelector("#cart-count");
          if (cartCountSpan) {
            const currentCount = parseInt(cartCountSpan.textContent) || 0;
            cartCountSpan.textContent = (currentCount + 1).toString();
          }

          console.log("Количество обновлено:", { productId, quantity: currentQty });
          await renderProfile(user);
        } catch (err) {
          console.error("Ошибка при увеличении количества:", err.message);
          alert(`Не удалось обновить количество: ${err.message}`);
          await renderProfile(user);
        }
      });
    });

    decreaseButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const productId = parseInt(button.getAttribute("data-product-id"));
        console.log("Попытка уменьшить количество:", { productId });

        if (isNaN(productId) || productId < 1) {
          console.error("Неверный productId:", productId);
          alert("Ошибка: неверный идентификатор продукта");
          return;
        }

        const row = button.closest("tr");
        if (!row) {
          console.error("Не найдена строка таблицы для productId:", productId);
          alert("Ошибка: не найдена строка товара");
          return;
        }

        const qtyDisplay = row.querySelector(".quantity-display");
        const qtyValueSpan = row.querySelector(".quantity-value");
        if (!qtyDisplay || !qtyValueSpan) {
          console.error("Не найдены элементы количества для productId:", productId);
          alert("Ошибка: не найдены элементы количества");
          return;
        }

        let currentQty = parseInt(qtyValueSpan.textContent);
        if (isNaN(currentQty)) {
          console.error("Неверное текущее количество:", qtyValueSpan.textContent);
          alert("Ошибка: неверное текущее количество");
          return;
        }

        if (currentQty <= 1) {
          if (confirm("Вы хотите удалить товар из корзины?")) {
            try {
              const res = await fetch(`/api/cart/${productId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userId: user.id }),
              });

              if (!res.ok) {
                const result = await res.json();
                throw new Error(result.error || `Ошибка HTTP: ${res.status}`);
              }

              console.log("Товар удален из корзины:", { productId });
              alert("Товар удален из корзины");
              await renderProfile(user);
            } catch (err) {
              console.error("Ошибка при удалении товара:", err.message);
              alert(`Не удалось удалить товар: ${err.message}`);
              await renderProfile(user);
            }
          }
          return;
        }

        currentQty -= 1;

        try {
          const res = await fetch(`/api/cart/${productId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ quantity: currentQty, userId: user.id }),
          });

          if (!res.ok) {
            const result = await res.json();
            throw new Error(result.error || `Ошибка HTTP: ${res.status}`);
          }

          qtyDisplay.textContent = currentQty.toString();
          qtyValueSpan.textContent = currentQty.toString();

          const priceCell = row.cells[3];
          if (!priceCell) {
            console.error("Не найдена ячейка цены для productId:", productId);
            alert("Ошибка: не найдена цена товара");
            return;
          }
          const price = parseFloat(priceCell.textContent);
          if (isNaN(price)) {
            console.error("Неверная цена:", priceCell.textContent);
            alert("Ошибка: неверная цена товара");
            return;
          }

          const totalCell = row.cells[4];
          if (totalCell) {
            totalCell.textContent = (currentQty * price).toFixed(2) + " ₽";
          } else {
            console.error("Не найдена ячейка общей стоимости для productId:", productId);
          }

          const cartCountSpan = userInfoDiv.querySelector("#cart-count");
          if (cartCountSpan) {
            const currentCount = parseInt(cartCountSpan.textContent) || 0;
            cartCountSpan.textContent = Math.max(currentCount - 1, 0).toString();
          }

          console.log("Количество обновлено:", { productId, quantity: currentQty });
          await renderProfile(user);
        } catch (err) {
          console.error("Ошибка при уменьшении количества:", err.message);
          alert(`Не удалось обновить количество: ${err.message}`);
          await renderProfile(user);
        }
      });
    });

    // --- КНОПКА "НАЗАД" ---
    const backBtn = userInfoDiv.querySelector(".back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        window.location.href = "/index.html";
      });
    }

    // --- КНОПКА "СДЕЛАТЬ ЗАКАЗ" ---
    const placeOrderBtn = userInfoDiv.querySelector(".place-order-btn");
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener("click", async () => {
        if (cart.length === 0) {
          alert("Ваша корзина пуста.");
          return;
        }
        if (!confirm("Вы уверены, что хотите оформить заказ?")) {
          return;
        }
        try {
          const orders = cart.map((item) => ({
            productId: item.productId,
            count: item.quantity,
            date: new Date().toISOString().split("T")[0],
            time: new Date().toTimeString().split(" ")[0],
            status: "Подготавливается",
          }));

          const response = await fetch("/api/delivery/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ orders }),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
          }

          alert("Заказ успешно оформлен!");
          await renderProfile(user);
        } catch (err) {
          console.error("Ошибка при оформлении заказа:", err.message);
          alert(`Не удалось оформить заказ: ${err.message}`);
          await renderProfile(user);
        }
      });
    }

    // --- ОБРАБОТЧИКИ ВЫХОДА И РЕДАКТИРОВАНИЯ ---
    const modal = userInfoDiv.querySelector("#change-password-modal");
    const closeModal = modal.querySelector(".close");
    const logoutBtn = userInfoDiv.querySelector(".logout-btn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          const res = await fetch("/logout", {
            method: "POST",
            credentials: "include",
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || `HTTP error! status: ${res.status}`);
          alert("Выход успешен");
          window.location.href = "/index.html";
        } catch (err) {
          alert(`Ошибка выхода: ${err.message}`);
        }
      });
    }

    if (!editable) {
      userInfoDiv
        .querySelector(".edit-profile-btn")
        ?.addEventListener("click", () => {
          renderProfile(user, true);
        });

      userInfoDiv
        .querySelector(".change-password-btn")
        ?.addEventListener("click", () => {
          modal.style.display = "block";
        });
    } else {
      userInfoDiv.querySelector(".cancel-btn")?.addEventListener("click", () => {
        renderProfile(user, false);
      });
    }

    // --- Модальное окно смены пароля ---
    if (closeModal) {
      closeModal.addEventListener("click", () => {
        modal.style.display = "none";
      });
    }

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });

    const passwordForm = userInfoDiv.querySelector("#change-password-form");
    if (passwordForm) {
      passwordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById("password").value.trim();
        const newPassword = document.getElementById("new-password").value.trim();
        const confirmPassword = document.getElementById("confirm-password").value.trim();

        if (newPassword.length < 8) {
          alert("Новый пароль должен содержать не менее 8 символов");
          return;
        }
        if (newPassword !== confirmPassword) {
          alert("Новые пароли не совпадают");
          return;
        }

        try {
          const res = await fetch("/api/users/me/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ currentPassword, newPassword }),
          });

          const result = await res.json();
          if (!res.ok) throw new Error(result.error || `HTTP error! status: ${res.status}`);

          alert("Пароль успешно изменён");
          modal.style.display = "none";
          passwordForm.reset();
          await renderProfile(user);
        } catch (err) {
          alert(`Ошибка: ${err.message}`);
          await renderProfile(user);
        }
      });

      userInfoDiv
        .querySelector(".cancel-password-btn")
        ?.addEventListener("click", () => {
          modal.style.display = "none";
          passwordForm.reset();
        });
    }

    // --- Форма редактирования профиля ---
    if (editable) {
      const form = document.getElementById("profile-form");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const username = document.getElementById("username").value.trim();
          const email = document.getElementById("email").value.trim();
          const updatedUser = { username, email };

          try {
            const res = await fetch("/api/users/me", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(updatedUser),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || `HTTP error! status: ${res.status}`);

            alert("Профиль обновлён");
            await renderProfile(result.user, false);
          } catch (err) {
            alert(`Ошибка: ${err.message}`);
            await renderProfile(user);
          }
        });
      }
    }

    // --- Удаление товаров из избранного ---
    const removeFavoriteButtons = userInfoDiv.querySelectorAll(".remove-favorite-btn");
    removeFavoriteButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const productId = parseInt(button.getAttribute("data-product-id"));
        console.log("Удаление из избранного:", { productId });
        if (isNaN(productId) || productId < 1) {
          console.error("Invalid productId:", productId);
          alert("Ошибка: неверный идентификатор продукта");
          return;
        }

        if (!confirm("Вы уверены, что хотите удалить товар из избранного?")) {
          return;
        }

        try {
          const res = await fetch("/api/favorites/toggle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ productId }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || `HTTP error! status: ${res.status}`);

          console.log("Товар удален из избранного:", { productId });
          alert("Удалено из избранного");
          await renderProfile(user);
        } catch (err) {
          console.error("Ошибка удаления из избранного:", err.message);
          alert(`Ошибка: ${err.message}`);
          await renderProfile(user);
        }
      });
    });

    // --- Удаление товаров из корзины ---
    const removeCartButtons = userInfoDiv.querySelectorAll(".remove-cart-btn");
    removeCartButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const productId = parseInt(button.getAttribute("data-product-id"));
        console.log("Удаление из корзины:", { productId });

        if (isNaN(productId) || productId < 1) {
          console.error("Invalid productId:", productId);
          alert("Ошибка: неверный идентификатор продукта");
          return;
        }

        if (!confirm("Вы уверены, что хотите удалить товар из корзины?")) {
          return;
        }

        try {
          const res = await fetch(`/api/cart/${productId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ userId: user.id }),
          });

          const result = await res.json();
          if (!res.ok) throw new Error(result.error || `Ошибка HTTP: ${res.status}`);

          console.log("Товар удален из корзины:", { productId });
          alert("Удалено из корзины");
          await renderProfile(user);
        } catch (err) {
          console.error("Ошибка при удалении из корзины:", err.message);
          alert(`Ошибка: ${err.message}`);
          await renderProfile(user);
        }
      });
    });

    // --- Кнопки "Перейти" ---
    const goToProductButtons = userInfoDiv.querySelectorAll(".go-to-product-btn");
    goToProductButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const productId = button.getAttribute("data-product-id");
        if (productId && !isNaN(parseInt(productId))) {
          window.location.href = `/product/${productId}`;
        } else {
          console.error("Invalid productId:", productId);
          alert("Ошибка: неверный идентификатор продукта");
        }
      });
    });
  }

  // Инициализация
  console.log("Инициализация cabinet.js");
  loadUserData().then((user) => {
    if (user) {
      renderProfile(user).catch((err) => {
        console.error("Ошибка при рендеринге профиля:", err.message);
        userInfoDiv.innerHTML = "<p>Ошибка загрузки профиля.</p>";
      });
    }
  });
});