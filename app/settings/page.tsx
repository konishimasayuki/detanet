'use client';

import { useEffect, useState } from 'react';

type ModelSetting = {
  tenjyo: number | null;
  payoutYen: number | null;
  costPerGameYen: number | null;
};

type SettingsMap = Record<string, ModelSetting>;

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [newModelName, setNewModelName] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings || {});
        setLoading(false);
      });
  }, []);

  async function saveModel(modelName: string, values: ModelSetting) {
    setSaving(modelName);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelName, ...values }),
    });
    setSaving(null);
  }

  async function removeModel(modelName: string) {
    await fetch('/api/settings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelName }),
    });
    setSettings((prev) => {
      const next = { ...prev };
      delete next[modelName];
      return next;
    });
  }

  function updateField(modelName: string, field: keyof ModelSetting, value: string) {
    setSettings((prev) => ({
      ...prev,
      [modelName]: {
        ...prev[modelName],
        [field]: value === '' ? null : Number(value),
      },
    }));
  }

  function addModel() {
    const name = newModelName.trim();
    if (!name || settings[name]) return;
    setSettings((prev) => ({
      ...prev,
      [name]: { tenjyo: null, payoutYen: null, costPerGameYen: 20 },
    }));
    setNewModelName('');
  }

  const modelNames = Object.keys(settings).sort();

  return (
    <main className="board">
      <header className="board-header">
        <div>
          <p className="board-eyebrow">GOLDRUSH TOSU</p>
          <h1 className="board-title">機種設定</h1>
        </div>
      </header>

      <p className="settings-help">
        天井ゲーム数・天井到達時の期待収支(円)・1ゲームあたりの単価(円)を機種ごとに登録すると、
        狙い台リストの期待値計算に反映されます。未設定の機種は簡易計算で表示されます。
      </p>

      <div className="settings-add">
        <input
          className="login-input settings-add-input"
          placeholder="機種名を入力(例: L東京喰種)"
          value={newModelName}
          onChange={(e) => setNewModelName(e.target.value)}
        />
        <button className="login-button settings-add-button" onClick={addModel}>
          追加
        </button>
      </div>

      {loading ? (
        <p className="settings-help">読み込み中...</p>
      ) : (
        <ul className="settings-list">
          {modelNames.length === 0 && (
            <p className="settings-help">まだ機種が登録されていません。</p>
          )}
          {modelNames.map((name) => {
            const s = settings[name];
            return (
              <li key={name} className="settings-row">
                <span className="settings-model-name">{name}</span>
                <div className="settings-fields">
                  <label className="settings-field">
                    <span>天井(G)</span>
                    <input
                      className="login-input settings-input"
                      type="number"
                      value={s.tenjyo ?? ''}
                      onChange={(e) => updateField(name, 'tenjyo', e.target.value)}
                    />
                  </label>
                  <label className="settings-field">
                    <span>天井時期待収支(円)</span>
                    <input
                      className="login-input settings-input"
                      type="number"
                      value={s.payoutYen ?? ''}
                      onChange={(e) => updateField(name, 'payoutYen', e.target.value)}
                    />
                  </label>
                  <label className="settings-field">
                    <span>ゲーム単価(円)</span>
                    <input
                      className="login-input settings-input"
                      type="number"
                      value={s.costPerGameYen ?? ''}
                      onChange={(e) => updateField(name, 'costPerGameYen', e.target.value)}
                    />
                  </label>
                </div>
                <div className="settings-actions">
                  <button
                    className="settings-save"
                    onClick={() => saveModel(name, s)}
                    disabled={saving === name}
                  >
                    {saving === name ? '保存中...' : '保存'}
                  </button>
                  <button className="settings-remove" onClick={() => removeModel(name)}>
                    削除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
