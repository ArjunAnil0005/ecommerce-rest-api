async function createCategory(request, token, name, parent) {
  const response = await request
    .post('/api/v1/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, ...(parent ? { parent } : {}) });

  if (response.status !== 201) {
    throw new Error(`Could not create test category "${name}"`);
  }

  return response.body.data.category;
}

async function createCategoryTree(request, token) {
  const electronics = await createCategory(request, token, 'Electronics');
  const mobiles = await createCategory(
    request,
    token,
    'Mobiles',
    electronics._id,
  );
  const androidPhones = await createCategory(
    request,
    token,
    'Android Phones',
    mobiles._id,
  );
  const samsung = await createCategory(
    request,
    token,
    'Samsung',
    androidPhones._id,
  );
  const onePlus = await createCategory(
    request,
    token,
    'OnePlus',
    androidPhones._id,
  );
  const iPhones = await createCategory(request, token, 'iPhones', mobiles._id);
  const computers = await createCategory(
    request,
    token,
    'Computers',
    electronics._id,
  );
  const laptops = await createCategory(
    request,
    token,
    'Laptops',
    computers._id,
  );
  const desktops = await createCategory(
    request,
    token,
    'Desktops',
    computers._id,
  );

  return {
    electronics,
    mobiles,
    androidPhones,
    samsung,
    onePlus,
    iPhones,
    computers,
    laptops,
    desktops,
  };
}

module.exports = { createCategory, createCategoryTree };
