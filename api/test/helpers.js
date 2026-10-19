// Minimal Express-like response double for controller tests
const mockRes = () => {
  const res = {
    statusCode: 200,
    body: undefined,
    cookies: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value) {
      this.cookies[name] = value;
      return this;
    },
  };
  return res;
};

// Chainable query double: every method returns itself, awaiting yields value
const mockQuery = (value, calls = []) => {
  const q = {
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  for (const m of ['select', 'populate', 'sort', 'skip', 'limit', 'lean']) {
    q[m] = (...args) => {
      calls.push([m, ...args]);
      return q;
    };
  }
  return q;
};

module.exports = { mockRes, mockQuery };
