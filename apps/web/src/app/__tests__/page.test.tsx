describe('Web App Smoke Test', () => {
  it('smoke test passes', () => {
    expect(true).toBe(true);
  });

  it('can import and use React', async () => {
    const React = await import('react');
    expect(React).toBeDefined();
    expect(React.version).toBeDefined();
  });
});
