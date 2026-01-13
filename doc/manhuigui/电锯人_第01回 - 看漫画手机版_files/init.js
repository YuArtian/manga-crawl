function c_tag_mk(t, e, i) {
  let n;
  'img' == t
    ? ((n = document.createElement('img')),
      n.setAttribute('style', 'display:none'),
      n.setAttribute('height', '0'),
      n.setAttribute('width', '0'),
      (n.src = e),
      document.body.appendChild(n))
    : 'iframe' == t
    ? ((n = document.createElement('iframe')),
      n.setAttribute('style', 'display:none'),
      n.setAttribute('height', '0'),
      n.setAttribute('width', '0'),
      (n.src = e),
      document.body.appendChild(n))
    : ((n = document.createElement('script')),
      (n.type = 'text/javascript'),
      (n.src = e),
      i && (n.async = !0),
      document.getElementsByTagName('body').length > 0
        ? document.getElementsByTagName('body')[0].appendChild(n)
        : document.getElementsByTagName('head').length > 0 &&
          document.getElementsByTagName('head')[0].appendChild(n));
}
function getCookie(t) {
  const e = `; ${document.cookie}`,
    i = e.split(`; ${t}=`);
  if (2 === i.length) return i.pop().split(';').shift();
}
function getVideoCardInfo() {
  const t = document.createElement('canvas').getContext('webgl');
  if (!t) return { vendor: 'no webgl', renderer: 'no webgl' };
  const e = t.getExtension('WEBGL_debug_renderer_info');
  return e
    ? {
        vendor: t.getParameter(e.UNMASKED_VENDOR_WEBGL),
        renderer: t.getParameter(e.UNMASKED_RENDERER_WEBGL)
      }
    : {
        vendor: 'no WEBGL_debug_renderer_info',
        renderer: t.getParameter(e.UNMASKED_RENDERER_WEBGL)
      };
}

(function () {
  function t() {
    return /PlayStation/i.test(userAgent)
      ? ((a = 8), !0)
      : /Xbox/i.test(userAgent)
      ? ((a = 9), !0)
      : /Nintendo/i.test(userAgent)
      ? ((a = 10), !0)
      : /Android/i.test(userAgent)
      ? ((a = 6), !0)
      : /iPhone/i.test(userAgent) || /ipod/i.test(userAgent) || /iPad/i.test(userAgent)
      ? ((a = 5), !0)
      : /Windows NT/i.test(userAgent)
      ? ((a = 1), !0)
      : /Mac OS/i.test(userAgent)
      ? ((a = 2), !0)
      : /Ubuntu/i.test(userAgent)
      ? ((a = 3), !0)
      : !!/Linux/i.test(userAgent) && ((a = 4), !0);
  }
  function e() {
    return /PlayStation/i.test(userAgent) || /Nintendo/i.test(userAgent) || /Xbox/i.test(userAgent)
      ? ((l = 4), !0)
      : /iPad/i.test(userAgent) ||
        /pad/i.test(userAgent) ||
        /SAMSUNG SM-T/i.test(userAgent) ||
        /SGP771/i.test(userAgent) ||
        /Tablet/i.test(userAgent) ||
        /Pixel C/i.test(userAgent)
      ? ((l = 3), !0)
      : /Android/i.test(userAgent) ||
        /iPhone/i.test(userAgent) ||
        /ipod/i.test(userAgent) ||
        /Windows Phone/i.test(userAgent)
      ? ((l = 2), !0)
      : !!(
          /Windows NT/i.test(userAgent) ||
          /CrOS/i.test(userAgent) ||
          /Linux/i.test(userAgent) ||
          /Mac OS/i.test(userAgent)
        ) && ((l = 1), !0);
  }
  function i() {
    return /MSIE/i.test(userAgent) ||
      /Edg/i.test(userAgent) ||
      (/Mozilla/i.test(userAgent) && /Trident/i.test(userAgent))
      ? ((d = 1), !0)
      : /Firefox/i.test(userAgent)
      ? ((d = 3), !0)
      : /Opera/i.test(userAgent)
      ? ((d = 4), !0)
      : /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)
      ? ((d = 5), !0)
      : !((!/Chrome/i.test(userAgent) && !/Mozilla/i.test(userAgent)) || ((d = 2), 0));
  }
  function n() {
    let t = window,
      e = window.parent;
    for (; e !== t; )
      try {
        t.document.body && e.document.body && ((t = e), (e = t.parent));
      } catch (t) {
        break;
      }
    let i = !1;
    try {
      window.top.innerWidth && (i = !1);
    } catch (t) {
      i = !0;
    }
    if (!i) return t;
    try {
      if (t.innerWidth) return t;
    } catch (e) {
      return t[0];
    }
  }
  const s = getCookie('FPUUID'),
    r = n();
  let a,
    d,
    o = document.getElementsByClassName('clickforceads'),
    userAgent = navigator.userAgent,
    l = 1,
    m = 0,
    p = 2,
    u = 1,
    f = 0,
    h = 0,
    g = 0,
    b = 0;
  if (1 == /Googlebot/i.test(navigator.userAgent)) return;
  c_tag_mk(
    'iframe',
    void 0 !== s
      ? `https://cdn.holmesmind.com/js/capmapping.htm?fp_uuid=${s}`
      : 'https://cdn.holmesmind.com/js/capmapping.htm'
  ),
    void 0 !== document.documentElement.clientHeight && (m = document.documentElement.clientHeight);
  try {
    void 0 !== self.frameElement.tagName && 'IFRAME' == self.frameElement.tagName && (u = 2);
  } catch (t) {
    u = 3;
  }
  3 !== u &&
    ((f = self.frameElement.offsetTop), (m = self.parent.document.documentElement.clientHeight)),
    t(),
    e(),
    i();
  let E = r ? r.location.href : '';
  const A = E.substring();
  if (-1 != location.href.indexOf('cfadc'))
    for (u in ((pms = location.href.split('?')[1].split('&')), pms))
      if (-1 != pms[u].indexOf('cfadc')) {
        let t = pms[u].split('=');
        (t = t[1].split(':')), t.length > 1 && ((h = t[0]), (g = t[1]));
      }
  if (-1 == A.indexOf('safari-reader'))
    for (var y = 0; y < o.length; y++) {
      (p = 2), 0 != m && (2 == u && (f = o[y].offsetTop), f <= m && (p = 1));
      let t = new Array();
      null != o[y].getAttribute('data-custFbAdapter') &&
        (t = o[y].getAttribute('data-custFbAdapter').split(';'));
      let e = o[y].getAttribute('data-ad-zone');
      if (e > 0 && 0 == o[y].getElementsByClassName('cfadif').length) {
        let i,
          n = Math.floor(1e3 * Math.random()) + 1,
          s = !1;
        if (userAgent.indexOf('CLICKFORCE Dev') != -1) {
          i = 'https://awspoc.holmesmind.com/adserver/';
        } else if (userAgent.indexOf('CLICKFORCE adv6') != -1) {
          i = 'https://ad-testv6.holmesmind.com/adserver/';
        } else {
          i = 'https://ad.holmesmind.com/adserver/';
        }
        let r = s ? '?' : 'ads.js?';
        if (
          ((r += 'z=' + e),
          (r += '&rf=' + encodeURIComponent(A)),
          (r += '&n=' + n),
          (r += '&o=' + a),
          (r += '&fc=' + getCookie('CFFPCKUUIDMAIN')),
          'undefined' == l)
        )
          r += '&d=1';
        else {
          if (2 == l) {
            let t = document.createElement('hitag');
            t.setAttribute('data-tag', '50ef57'), document.body.appendChild(t);
            let e = document.createElement('script');
            e.setAttribute('defer', ''),
              (e.src = '//t.ssp.hinet.net/tag.js'),
              document.body.appendChild(e);
          }
          r += '&d=' + l;
        }
        (r += '&b=' + d),
          (r += '&ts=' + p),
          (r += '&ii=' + u),
          null != o[y].getAttribute('data-click-marco') &&
            (r += '&cmt=' + encodeURIComponent(o[y].getAttribute('data-click-marco'))),
          (i += r);
        let m = document.createElement('div');
        o[y].appendChild(m);
        let f = document.createElement('iframe');
        (f.src = 'javascript:;'),
          f.setAttribute('class', 'cfadif cfadif' + y),
          f.setAttribute('id', 'cfadif' + n),
          f.setAttribute('width', 0),
          f.setAttribute('height', 0),
          f.setAttribute('scrolling', 'no'),
          f.setAttribute('marginheight', '0'),
          f.setAttribute('marginwidth', '0'),
          f.setAttribute('allowtransparency', 'true'),
          f.setAttribute('vspace', 0),
          f.setAttribute('hspace', 0),
          f.setAttribute('frameborder', 0),
          m.appendChild(f),
          0 == /CFPTJ/i.test(navigator.userAgent)
            ? 0 != h &&
              0 != g &&
              h == e &&
              (i =
                -1 != userAgent.indexOf('CLICKFORCE Dev')
                  ? 'https://awspoc.holmesmind.com/adserver/ads.js?z=' + e + '&preview=' + g
                  : -1 != userAgent.indexOf('CLICKFORCE adv6')
                  ? 'https://ad-testv6.holmesmind.com/ads.js?z=' + e + '&preview=' + g
                  : 'https://ad.holmesmind.com/adserver/ads.js?z=' + e + '&preview=' + g)
            : (i =
                -1 != userAgent.indexOf('CLICKFORCE Dev')
                  ? 'https://awspoc.holmesmind.com/adserver/ads.js?z=' + e + '&preview=1'
                  : -1 != userAgent.indexOf('CLICKFORCE adv6')
                  ? 'https://ad-testv6.holmesmind.com/adserver/ads.js?z=' + e + '&preview=1'
                  : 'https://ad.holmesmind.com/adserver/ads.js?z=' + e + '&preview=1');
        let E = o[y].style.width.replace(/px/, ''),
          C = o[y].style.height.replace(/px/, ''),
          w =
            '<script type="text/javascript" >var au="' +
            i +
            '",zid="' +
            e +
            '",cfde="' +
            l +
            '",crtCheck = false,crtBidder = null,fbList = new Array() ,zw="' +
            E +
            '", pe="' +
            r +
            '", zh="' +
            C +
            '";</script>';
        if (t.length > 0)
          for (var v = 0; v < t.length; v++)
            w += '<script type="text/javascript" src="' + t[v] + '"></script>';
        if (1 == b)
          (w +=
            '<div id="cfad' + e + '"></div><script type="text/javascript" id="cfzfsc"></script>'),
            f.contentDocument.write(w),
            f.contentDocument.close(),
            stfpjs(i, 'cfadif' + n);
        else {
          let t = 'https://cdn.holmesmind.com/js/presetfn.js?20231115';
          (w += '<div id="cfad' + e + '"></div>'),
            (w += '<script type="text/javascript" src="' + t + '" async></script>'),
            f.contentDocument.write(w),
            f.contentDocument.close();
        }
      }
      (o[y].style.width = ''), (o[y].style.height = '');
    }
})();
