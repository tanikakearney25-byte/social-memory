const locales=['zh-CN','zh-TW','en','ko','ja'];
const rows={
 language:['界面语言','介面語言','Language','인터페이스 언어','表示言語'],
 auto:['跟随浏览器','跟隨瀏覽器','Browser default','브라우저 설정 따르기','ブラウザーに合わせる'],
 checking:['正在检查账号…','正在檢查帳號…','Checking this profile…','계정 확인 중…','アカウントを確認中…'],
 bridgeChecking:['正在检查本地桥接…','正在檢查本機橋接…','Checking local bridge…','로컬 연결 확인 중…','ローカル接続を確認中…'],
 bridgeReady:['本地桥接已连接','本機橋接已連線','Local bridge ready','로컬 연결 준비 완료','ローカル接続の準備完了'],
 bridgeMissing:['本地桥接未连接，请检查安装','本機橋接未連線，請檢查安裝','Local bridge missing; check installation','로컬 연결을 찾을 수 없습니다. 설치를 확인하세요','ローカル接続が見つかりません。設定を確認してください'],
 profileMissing:['未识别到登录账号','未辨識到登入帳號','Signed-in account not detected','로그인 계정을 확인할 수 없습니다','ログイン中のアカウントを確認できません'],
 openSite:['请先打开 Threads 或 X','請先開啟 Threads 或 X','Open X or Threads first','먼저 Threads 또는 X를 여세요','先に Threads または X を開いてください'],
 choices:['采集类型','收集類型','Collect from this profile','수집할 활동','収集する種類'],
 like:['点赞','按讚','Likes','좋아요','いいね'],save:['收藏','收藏','Saves','저장','保存'],repost:['转发','轉發','Reposts','리포스트','リポスト'],
 quantity:['每类采集数量','每類收集數量','Posts per type','활동별 수집 개수','種類ごとの収集件数'],
 count:['{n} 条','{n} 則','{n} posts','{n}개','{n}件'],
 testCount:['3 条（测试）','3 則（測試）','3 posts (test)','3개 (테스트)','3件（テスト）'],
 custom:['自定义','自訂','Custom','직접 입력','件数を指定'],
 unlimited:['无上限（持续抓取历史）','無上限（持續收集歷史）','Unlimited (collect history)','제한 없음 (과거 기록 수집)','上限なし（過去の投稿を収集）'],
 customPlaceholder:['输入每类数量','輸入每類數量','Enter posts per type','활동별 개수 입력','種類ごとの件数を入力'],
 hint:['数量含已入库帖子的更新。请保持采集页可见，无需手动翻页。无上限分批保存，检测到收藏页脚或约30秒无新内容时结束；不保证平台展示全部历史。','數量包含已入庫貼文的更新。請保持收集頁可見，無需手動翻頁。無上限會分批儲存，偵測到收藏頁尾或約30秒無新內容時結束；平台可能未顯示全部歷史。','Counts include updates to archived posts. Keep the collection tab visible; scrolling is automatic. Unlimited saves in batches and stops at the saved-list footer or after about 30 seconds without new content. Complete platform history is not guaranteed.','기존 게시물 업데이트도 개수에 포함됩니다. 수집 탭을 보이게 두세요. 스크롤은 자동입니다. 제한 없음은 나누어 저장하며, 저장 목록의 하단 안내 또는 약 30초 동안 새 내용이 없으면 종료됩니다. 전체 기록 수집을 보장하지는 않습니다.','既存の投稿の更新も件数に含みます。収集タブを表示したままにしてください。スクロールは自動です。上限なしでは分割保存し、保存一覧のフッター、または約30秒新しい内容がない場合に終了します。全履歴の取得は保証されません。'],
 connect:['连接账号','連線帳號','Connect profile','계정 연결','アカウントを接続'],collect:['立即采集','立即收集','Collect now','지금 수집','今すぐ収集'],
 stop:['停止采集（保留已保存内容）','停止收集（保留已儲存內容）','Stop (keep saved posts)','수집 중지 (저장된 내용 유지)','停止（保存済みの内容を保持）'],
 daily:['Chrome 运行时每天采集一次','Chrome 執行時每天收集一次','Collect once daily while Chrome is running','Chrome 실행 중 하루 한 번 수집','Chrome の起動中に毎日1回収集'],
 working:['处理中…','處理中…','Working…','처리 중…','処理中…'],
 connected:['此 Chrome 账号已连接。','此 Chrome 帳號已連線。','This Chrome profile is connected.','이 Chrome 계정이 연결되었습니다.','この Chrome プロファイルは接続済みです。'],
 choose:['选择采集类型，然后连接账号。','選擇收集類型，然後連線帳號。','Choose what to collect, then connect.','수집할 활동을 선택한 뒤 계정을 연결하세요.','収集する種類を選んで接続してください。'],
 justConnected:['连接成功，已自动识别账号。','連線成功，已自動辨識帳號。','Connected. Your handle was detected automatically.','연결되었습니다. 계정을 자동으로 확인했습니다.','接続しました。アカウントを自動検出しました。'],
 running:['采集中：已保存 {count} 条，当前类型：{kind}。可以关闭弹窗，请保持采集页可见。','收集中：已儲存 {count} 則，目前類型：{kind}。可以關閉彈窗，請保持收集頁可見。','Collecting: {count} records saved. Current type: {kind}. You may close this popup; keep the collection tab visible.','수집 중: {count}개 저장됨. 현재 활동: {kind}. 팝업은 닫아도 됩니다. 수집 탭은 보이게 두세요.','収集中：{count}件保存済み。現在：{kind}。ポップアップは閉じても構いません。収集タブは表示したままにしてください。'],
 waiting:['已保存 {count} 条；采集页不可见，等待恢复。请保持采集标签页可见。','已儲存 {count} 則；收集頁不可見，等待恢復。請保持收集分頁可見。','{count} saved. Collection paused while the tab is hidden. Keep the collection tab visible.','{count}개 저장됨. 수집 탭이 숨겨져 일시 대기 중입니다. 탭을 보이게 해 주세요.','{count}件保存済み。収集タブが非表示のため待機中です。タブを表示してください。'],
 failed:['已暂停，保留已保存的 {count} 条记录：{error}','已暫停，保留已儲存的 {count} 則記錄：{error}','Paused; {count} saved records retained: {error}','일시 중지됨. 저장된 {count}개는 유지됩니다: {error}','一時停止しました。保存済みの{count}件は保持されています：{error}'],
 cancelled:['已停止，本轮已保存 {count} 条记录。','已停止，本輪已儲存 {count} 則記錄。','Stopped. This run saved {count} records.','중지되었습니다. 이번 수집에서 {count}개를 저장했습니다.','停止しました。今回{count}件の記録を保存しました。'],
 done:['本轮已保存 {count} 条记录（含重复记录的更新）。{ending}','本輪已儲存 {count} 則記錄（含重複記錄的更新）。{ending}','This run saved {count} records, including updates to existing posts. {ending}','이번 수집에서 기존 게시물 업데이트를 포함해 {count}개를 저장했습니다. {ending}','今回、既存投稿の更新を含め{count}件の記録を保存しました。{ending}'],
 footerEnd:['已检测到收藏页底部页脚，收藏采集结束。','已偵測到收藏頁底部頁尾，收藏收集結束。','Saved-list footer detected; saved-post collection finished.','저장 목록 하단 안내를 확인하여 저장 게시물 수집을 마쳤습니다.','保存一覧のフッターを検出し、保存投稿の収集を終了しました。'],
 observedEnd:['页面多次没有新内容，已停止；历史完整性未证明。','頁面多次沒有新內容，已停止；歷史完整性尚未確認。','Stopped after repeated checks found no new content; complete history is not verified.','여러 번 확인해도 새 내용이 없어 종료했습니다. 전체 기록 수집 여부는 확인되지 않았습니다.','繰り返し確認しても新しい内容がないため終了しました。全履歴の取得は未確認です。'],
 limitEnd:['已达到选择的数量或页面显示为空。','已達到選擇的數量或頁面顯示為空。','Selected count reached, or the page is empty.','선택한 개수에 도달했거나 목록이 비어 있습니다.','指定件数に達したか、一覧が空です。'],
 stopping:['正在停止，已保存的数据会保留。','正在停止，已儲存的資料會保留。','Stopping; saved data will be retained.','중지하는 중입니다. 저장된 내용은 유지됩니다.','停止しています。保存済みのデータは保持されます。'],
 dailyOn:['已开启每日采集。','已開啟每日收集。','Daily collection enabled.','매일 수집을 켰습니다.','毎日の収集を有効にしました。'],dailyOff:['已关闭每日采集。','已關閉每日收集。','Daily collection disabled.','매일 수집을 껐습니다.','毎日の収集を無効にしました。'],
 invalidCount:['请输入大于0的整数。','請輸入大於0的整數。','Enter a positive whole number.','1 이상의 정수를 입력하세요.','1以上の整数を入力してください。'],
 errIdentity:['无法确认登录账号，请检查 Threads 登录状态。','無法確認登入帳號，請檢查 Threads 登入狀態。','Cannot verify the signed-in account; check your Threads login.','로그인 계정을 확인할 수 없습니다. Threads 로그인 상태를 확인하세요.','ログイン中のアカウントを確認できません。Threads のログイン状態を確認してください。'],
 errMismatch:['账号发生变化，请重新连接。','帳號已變更，請重新連線。','The account changed; reconnect this profile.','계정이 변경되었습니다. 다시 연결하세요.','アカウントが変わりました。再接続してください。'],
 errSurface:['无法确认采集列表页面，请检查页面是否正常加载。','無法確認收集列表頁面，請檢查頁面是否正常載入。','Cannot verify the collection page; check that it loaded correctly.','수집 목록을 확인할 수 없습니다. 페이지가 정상적으로 로드되었는지 확인하세요.','収集一覧を確認できません。ページが正常に読み込まれたか確認してください。'],
 errParse:['未解析出帖子，页面结构可能变化。已保存的数据会保留。','未解析出貼文，頁面結構可能已變更。已儲存資料會保留。','No posts could be parsed; the page structure may have changed. Saved data is retained.','게시물을 읽지 못했습니다. 페이지 구조가 바뀌었을 수 있습니다. 저장된 내용은 유지됩니다.','投稿を解析できません。ページ構造が変更された可能性があります。保存済みの内容は保持されます。'],
 errBusy:['已有任务运行，请等待或先停止。','已有任務執行中，請等待或先停止。','A collection is running; wait or stop it first.','이미 수집 중입니다. 기다리거나 먼저 중지하세요.','収集が実行中です。待つか先に停止してください。'],
 errBridge:['本地桥接未连接，请检查安装。','本機橋接未連線，請檢查安裝。','Local bridge unavailable; check its installation.','로컬 연결을 사용할 수 없습니다. 설치를 확인하세요.','ローカル接続を利用できません。設定を確認してください。'],
 errLoading:['页面持续加载，已暂停；已保存内容会保留。','頁面持續載入，已暫停；已儲存內容會保留。','Paused because the page kept loading. Saved content is retained.','페이지 로딩이 계속되어 일시 중지했습니다. 저장된 내용은 유지됩니다.','ページの読み込みが続くため一時停止しました。保存済みの内容は保持されます。'],
 errBlocked:['页面要求验证或限制访问，已暂停。','頁面要求驗證或限制存取，已暫停。','Paused: the page requires verification or limits access.','인증 요청 또는 접근 제한으로 일시 중지했습니다.','認証要求またはアクセス制限のため一時停止しました。'],
 errScroll:['滚动后没有新内容，无法确认列表结束；已保存内容会保留。','捲動後沒有新內容，無法確認列表結束；已儲存內容會保留。','Scrolling produced no new content; the end cannot be confirmed. Saved content is retained.','스크롤 후 새 내용이 없습니다. 목록 끝인지 확인할 수 없으며 저장된 내용은 유지됩니다.','スクロール後に新しい内容がありません。一覧の終了は未確認です。保存済みの内容は保持されます。'],
 errConnect:['请先连接此 Chrome 账号。','請先連線此 Chrome 帳號。','Connect this Chrome profile first.','먼저 이 Chrome 계정을 연결하세요.','先にこの Chrome プロファイルを接続してください。'],
 languageSaveError:['无法保存语言设置：{error}','無法儲存語言設定：{error}','Could not save language preference: {error}','언어 설정을 저장하지 못했습니다: {error}','言語設定を保存できませんでした：{error}'],
};
export const messages=Object.fromEntries(locales.map((locale,index)=>[locale,Object.fromEntries(Object.entries(rows).map(([key,values])=>[key,values[index]]))]));
export function resolveLanguage(setting,browserLanguage='en') {
 if(locales.includes(setting)) return setting;
 const code=String(browserLanguage).toLowerCase();
 if(code.startsWith('zh')) return /tw|hk|mo|hant/.test(code)?'zh-TW':'zh-CN';
 if(code.startsWith('ko')) return 'ko';if(code.startsWith('ja')) return 'ja';
 return 'en';
}
export function translate(language,key,params={}) {
 return (messages[language]?.[key]??messages.en[key]??key).replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??''));
}
export function translateError(language,value) {
 const message=String(value||'');
 const rules=[[/account changed/i,'errMismatch'],[/signed-in|Authenticated profile|로그인/i,'errIdentity'],[/collection page|finish loading/i,'errSurface'],[/No posts extracted/i,'errParse'],[/已有.*任务|已有.*任務|采集中/i,'errBusy'],[/native host|native messaging|bridge/i,'errBridge'],[/页面持续加载/,'errLoading'],[/要求验证|限制访问/,'errBlocked'],[/滚动后/,'errScroll'],[/Connect this Chrome profile first/i,'errConnect'],[/Open X or Threads/i,'openSite'],[/大于0|正整数/,'invalidCount']];
 if(/Enter a positive whole number/i.test(message))return translate(language,'invalidCount');
 const match=rules.find(([pattern])=>pattern.test(message));
 return match?translate(language,match[1]):message;
}
