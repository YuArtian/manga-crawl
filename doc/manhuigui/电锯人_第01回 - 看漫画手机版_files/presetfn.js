function setFirstPartyCookies(t, e, o, n) {
  (document.cookie =
    'CFFPCKUUIDMAIN=' + t + '; expires=' + o.toGMTString() + ';  domain=.' + n + '; path=/'),
    (document.cookie =
      'FPUUID=' + e + '; expires=' + o.toGMTString() + ';  domain=.' + n + '; path=/');
}
function pushfp(t) {
  window.setTimeout(function () {
    var e = '',
      o = '',
      n = '';
    if (void 0 !== t && '1' == t.status) {
      if (void 0 !== t.fpcw && 1 == t.fpcw) {
        var i =
            document.location.ancestorOrigins?.length > 0
              ? getRootDomain(
                  document.location.ancestorOrigins[
                    document.location.ancestorOrigins.length - 1
                  ].replace('https://', '')
                )
              : getRootDomain(document.location.hostname),
          r = new Date();
        function a(t, e) {
          document.cookie =
            'CFFPCKUUID=' + t + '; expires=' + e.toGMTString() + ';  domain=.' + i + '; path=/';
        }
        r.setTime(r.getTime() + 2592e6),
          (e = getCFFPCKUUID()),
          '' == e
            ? ((e = makeCFFPCKUUIDMAIN()), a(e, r))
            : (document.cookie =
                'CFFPCKUUID=' +
                e +
                '; expires=' +
                r.toGMTString() +
                ';  domain=.' +
                i +
                '; path=/'),
          (o = getCFFPCKUUIDMAIN()),
          (n = getFPUUID()),
          '' == o || '' == n
            ? ((o = makeCFFPCKUUIDMAIN()),
              (n = makeFPUUID(o)),
              '' !== n && setFirstPartyCookies(o, n, r, i))
            : '' !== n && setFirstPartyCookies(o, n, r, i);
      }
      passfck(o);
    }
  }, 200);
}
function passfck(t) {
  function e() {
    __hitagCmdQueue.push(arguments);
  }
  c_tag_mk('script', 'https://t.ssp.hinet.net/utag.js', !0);
  var o = '50ef57';
  (window.__hitagCmdQueue = window.__hitagCmdQueue || []),
    e('fire', { partnerId: o, referrer: getDomainWithHttp(document.referrer) }),
    e('cm', o, t);
}
function c_tag_mk(t, e, o) {
  if ('img' == t) {
    var n = document.createElement('img');
    n.setAttribute('style', 'display:none'),
      n.setAttribute('height', '0'),
      n.setAttribute('width', '0'),
      (n.src = e),
      document.body.appendChild(n);
  } else
    'iframe' == t
      ? ((n = document.createElement('iframe')),
        n.setAttribute('style', 'display:none'),
        n.setAttribute('height', '0'),
        n.setAttribute('width', '0'),
        (n.src = e),
        document.body.appendChild(n))
      : ((n = document.createElement('script')),
        (n.type = 'text/javascript'),
        (n.src = e),
        o && (n.async = !0),
        document.getElementsByTagName('body').length > 0
          ? document.getElementsByTagName('body')[0].appendChild(n)
          : document.getElementsByTagName('head').length > 0 &&
            document.getElementsByTagName('head')[0].appendChild(n));
}
function makeCFFPCKUUIDMAIN() {
  const t = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let e = '';
  for (let o = 0; o < 32; o++) {
    let o = Math.floor(62 * Math.random());
    e += t.charAt(o);
  }
  return Math.floor(9999 * Math.random()) + '-' + e;
}
function makeFPUUID(t) {
  function e(t) {
    return t.toString().padStart(4, '0');
  }
  ('' !== t && void 0 !== t) || (t = makeCFFPCKUUIDMAIN());
  const [o, n] = t.split('-'),
    i =
      '.' + document.location.ancestorOrigins?.length > 0
        ? getRootDomain(
            document.location.ancestorOrigins[document.location.ancestorOrigins.length - 1].replace(
              'https://',
              ''
            )
          )
        : getRootDomain(document.location.hostname);
  if ('.' === i) return '';
  const r = n + i;
  return e(o) + '-' + md5(r);
}
function getCFFPCKUUID() {
  for (var t = 'CFFPCKUUID=', e = document.cookie.split(';'), o = 0; o < e.length; o++) {
    var n = e[o].trim();
    if (0 == n.indexOf(t) && 'undefined' != n) return n.substring(t.length, n.length);
  }
  return '';
}
function getFPUUID() {
  for (var t = 'FPUUID=', e = document.cookie.split(';'), o = 0; o < e.length; o++) {
    var n = e[o].trim();
    if (0 == n.indexOf(t) && 'undefined' != n) return n.substring(t.length, n.length);
  }
  return '';
}
function getCFFPCKUUIDMAIN() {
  for (var t = 'CFFPCKUUIDMAIN=', e = document.cookie.split(';'), o = 0; o < e.length; o++) {
    var n = e[o].trim();
    if (0 == n.indexOf(t) && 'undefined' != n) return n.substring(t.length, n.length);
  }
  return '';
}
function getRootDomain(t) {
  if (!t) return '';
  var e,
    o = t.split('.');
  return (
    (e =
      o.length <= 2
        ? t
        : /^(com|edu|gov|int|mil|net|org|biz|info|name|pro|museum|coop|aero|jobs|travel|idv|io|co)$/.test(
            o[o.length - 2]
          )
        ? o.slice(o.length - 3).join('.')
        : o.slice(o.length - 2).join('.')),
    e
  );
}
function getDomainWithHttp(t = null) {
  if (
    ('/' == t.substr(-1) && (t = t.substring(0, t.length - 1)), (t = t.split('://')), 2 == t.length)
  ) {
    var e = t[1].split('/');
    return t[0] + '://' + getRootDomain(e[0]);
  }
  return (e = t[0].split('/')), getRootDomain(e[0]);
}
function bidstart() {
  var t = '',
    e = '',
    o = '';
  if ('undefined' != typeof preset && '1' == preset.status) {
    if (
      (parent.getGUDlock
        ? (au = au.replace('{rfstr}', encodeURIComponent(parent.cfifhref)))
        : (au = au.replace('{rfstr}', encodeURIComponent(location.href))),
      void 0 !== preset.fpcw && 1 == preset.fpcw)
    ) {
      var n =
          document.location.ancestorOrigins?.length > 0
            ? getRootDomain(
                document.location.ancestorOrigins[
                  document.location.ancestorOrigins.length - 1
                ].replace('https://', '')
              )
            : getRootDomain(document.location.hostname),
        i = new Date();
      i.setTime(i.getTime() + 2592e6),
        (t = getCFFPCKUUID()),
        '' == t
          ? ((t = makeCFFPCKUUIDMAIN()),
            (document.cookie =
              'CFFPCKUUID=' + t + '; expires=' + i.toGMTString() + ';  domain=.' + n + '; path=/'))
          : (document.cookie =
              'CFFPCKUUID=' + t + '; expires=' + i.toGMTString() + ';  domain=.' + n + '; path=/'),
        (e = getCFFPCKUUIDMAIN()),
        (o = getFPUUID()),
        '' == e || '' == o
          ? ((e = makeCFFPCKUUIDMAIN()),
            (o = makeFPUUID(e)),
            (document.cookie =
              'CFFPCKUUIDMAIN=' +
              e +
              '; expires=' +
              i.toGMTString() +
              ';  domain=.' +
              n +
              '; path=/'),
            (document.cookie =
              'FPUUID=' + o + '; expires=' + i.toGMTString() + ';  domain=.' + n + '; path=/'))
          : ((document.cookie =
              'CFFPCKUUIDMAIN=' +
              e +
              '; expires=' +
              i.toGMTString() +
              ';  domain=.' +
              n +
              '; path=/'),
            (document.cookie =
              'FPUUID=' + o + '; expires=' + i.toGMTString() + ';  domain=.' + n + '; path=/'));
    }
    (au += '&FPCK=' + e),
      (au += '&fp_uuid=' + o),
      (au += '&initver=230627P'),
      void 0 !== preset.local &&
        'SG' == preset.local &&
        (au = au.replace('ad.holmesmind.com', 'ad-sg.holmesmind.com')),
      c_tag_mk('script', au),
      pushfp(preset),
      -1 == navigator.userAgent.indexOf('CLICKFORCE Dev') &&
        void 0 !== preset.third_party_config &&
        (void 0 !== preset.third_party_config.innity &&
          c_tag_mk('script', 'https://cdn.holmesmind.com/js/innityV2.js', !0),
        void 0 !== preset.third_party_config.rtbHouse &&
          c_tag_mk('script', 'https://cdn.holmesmind.com/js/rtbhouseV2.js', !0),
        void 0 !== preset.third_party_config.criteo &&
          (c_tag_mk('script', 'https://static.criteo.net/js/ld/publishertag.js', !0),
          c_tag_mk('script', 'https://cdn.holmesmind.com/js/criteoV2.js', !0)),
        void 0 !== preset.third_party_config.bridgewell &&
          c_tag_mk('script', 'https://cdn.holmesmind.com/js/bridgewellV3.js', !0),
        void 0 !== preset.third_party_config.GroupM &&
          c_tag_mk('script', 'https://cdn.holmesmind.com/js/appierV2.js', !0),
        void 0 !== preset.third_party_config.appier &&
          c_tag_mk('script', 'https://cdn.holmesmind.com/js/appier_mainV3.js', !0),
        preset.third_party_config.onead,
        void 0 !== preset.third_party_config.cht &&
          c_tag_mk('script', 'https://cdn.holmesmind.com/js/prebid_mainV3.js', !0),
        void 0 !== preset.third_party_config.Teads &&
          c_tag_mk('script', 'https://cdn.holmesmind.com/js/teads_mainV3.js', !0),
        void 0 !== preset.third_party_config.ucfunnel &&
          c_tag_mk('script', 'https://cdn.holmesmind.com/js/ucfunnel.js', !0));
    // void 0 !== preset.third_party_config.fluct &&
    //   c_tag_mk('script', 'https://cdn.holmesmind.com/js/fluct.js', !0));
  }
}
(function () {
  if (navigator.userAgent.indexOf('CLICKFORCE Dev') != -1) {
    c_tag_mk('script', 'https://adcdn.holmesmind.com/adserver/Preset.js?z=' + zid);
  } else if (navigator.userAgent.indexOf('CLICKFORCE adv6') != -1) {
    // c_tag_mk('script', 'https://ad-testv6.holmesmind.com/adserver/Preset.js?z=' + zid);
    c_tag_mk('script', 'https://ad.holmesmind.com/adserver/Preset.js?z=' + zid);
  } else {
    c_tag_mk('script', 'https://ad.holmesmind.com/adserver/Preset.js?z=' + zid);
  }
  var script = document.createElement('script');
  script.src = 'https://cdn.holmesmind.com/js/js-md5.js';
  document.body.appendChild(script);
  let isMd5Version = 0;
  for (var t = document.cookie.split(';'), e = '', o = '', n = 0; n < t.length; n++) {
    var i = t[n].trim();
    0 == i.indexOf('FPUUID=')
      ? (e = i.substring('FPUUID='.length))
      : 0 == i.indexOf('CFFPCKUUIDMAIN=') && (o = i.substring('CFFPCKUUIDMAIN='.length));
    if (i.indexOf('ISMD5VERSION=') === 0) isMd5Version = 1;
  }
  script.addEventListener('load', () => {
    if (!isMd5Version || !e) {
      var r = e.split('-'),
        a = o.split('-'),
        s =
          document.location.ancestorOrigins?.length > 0
            ? getRootDomain(
                document.location.ancestorOrigins[
                  document.location.ancestorOrigins.length - 1
                ].replace('https://', '')
              )
            : getRootDomain(document.location.hostname),
        c = md5(a[1] + '.' + s);
      if (r[1] != c) {
        e = makeFPUUID(o);
        let t = new Date();
        t.setTime(t.getTime() + 2592e6),
          (document.cookie =
            'FPUUID=' + e + '; domain=.' + s + '; path=/; expires=' + t.toGMTString() + ';'),
          (document.cookie =
            'ISMD5VERSION=' + 1 + '; domain=.' + s + '; path=/; expires=' + t.toGMTString() + ';');
      }
    }
  });
})();
