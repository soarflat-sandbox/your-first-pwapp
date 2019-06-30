/*
 * @license
 * Your First PWA Codelab (https://g.co/codelabs/pwa)
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */
'use strict';

// ファイルを更新するたびに、CACHE_NAMEの更新が必要
const CACHE_NAME = 'static-cache-v1';
// アプリケーションデータのキャッシュ
const DATA_CACHE_NAME = 'data-cache-v1';

// CODELAB: Add list of files to cache here.
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/scripts/app.js',
  '/scripts/install.js',
  '/scripts/luxon-1.11.4.js',
  '/styles/inline.css',
  '/images/add.svg',
  '/images/clear-day.svg',
  '/images/clear-night.svg',
  '/images/cloudy.svg',
  '/images/fog.svg',
  '/images/hail.svg',
  '/images/install.svg',
  '/images/partly-cloudy-day.svg',
  '/images/partly-cloudy-night.svg',
  '/images/rain.svg',
  '/images/refresh.svg',
  '/images/sleet.svg',
  '/images/snow.svg',
  '/images/thunderstorm.svg',
  '/images/tornado.svg',
  '/images/wind.svg'
];

// ワーカーが実行されるとすぐにトリガーされるイベント
// Service Workerごとに1回だけ呼び出される
// Service Workerスクリプトを変更した場合、ブラウザーはそれを別の
// Service Workerスクリプトと見なし、新しくinstallイベントをトリガーする
// 通常、`install`イベントはアプリの実行に必要なすべてをキャッシュするために使用される
self.addEventListener('install', evt => {
  console.log('[ServiceWorker] Install');
  // CODELAB: Precache static resources here.
  // waitUntilにPromiseを渡すことで、Promiseが成功するまで、イベントの終了を待つ
  // 今回の場合、Precache（`return cache.addAll(FILES_TO_CACHE);`）が完了すれば
  // `install`イベントは終了する（インストール完了となる）
  evt.waitUntil(
    // Cache APIを利用してCacheStorage取得する
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Pre-caching offline page');
      // リソース（`/offline.html`）のキャッシュを保存
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  // インストール完了後、ページをリロードしなくても Service Worker がページの制御をする
  self.skipWaiting();
});

// 起動するたびにトリガーするイベント
// `activate`イベントの主な目的は、Service Workerの動作を設定し、
// 前回の実行から残ったリソース（古いキャッシュなど）をクリーンアップし、
// Service Workerがネットワーク要求を処理できるようにすること
self.addEventListener('activate', evt => {
  console.log('[ServiceWorker] Activate');
  // CODELAB: Remove previous cached data from disk.
  evt.waitUntil(
    // キャッシュ内の古いデータをクリーンアップする。
    // アプリケーションシェルファイルのいずれかが変更されるたびに、
    // Service Workerがそのキャッシュを更新するようにする
    // これをコードを有効にするためには、ファイルを変更するたびに`CACHE_NAME`も変更する必要がある
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  // Service Workerが更新されるとすぐにページの制御をする
  // この記述がない場合、ページをリロードしなかったりタブが残っていると
  // 古いService Workerがページを制御する
  self.clients.claim();
});

// 指定されたスコープ内のドキュメント、およびそれらのドキュメント内で参照されているリソースを含む、
// サービスワーカーによって制御されているリソースが取得されるたびにトリガーされるイベント
self.addEventListener('fetch', evt => {
  console.log('[ServiceWorker] Fetch', evt.request.url);
  // CODELAB: Add fetch event handler here.
  // 天気予報APIへのリクエストを傍受してそれらのレスポンスをキャッシュに保存する
  if (evt.request.url.includes('/forecast/')) {
    console.log('[Service Worker] Fetch (data)', evt.request.url);
    // respondWith()を利用すれば、ブラウザの通常のFetch処理を防ぎ任意のレスポンスを返せる
    evt.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return fetch(evt.request)
          .then(response => {
            // レスポンスが正常であればキャッシュに保存する
            if (response.status === 200) {
              cache.put(evt.request.url, response.clone());
            }
            return response;
          })
          .catch(err => {
            // ネットワークリクエストに失敗したらキャッシュを返す
            return cache.match(evt.request);
          });
      })
    );
    return;
  }

  // リクエストに応じたキャッシュが存在すればキャッシュを返す
  // 存在しなければネットワークリクエストのレスポンスを返す
  evt.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(evt.request).then(response => {
        return response || fetch(evt.request);
      });
    })
  );
});
