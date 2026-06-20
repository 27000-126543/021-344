export default defineAppConfig({
  pages: [
    'pages/project-list/index',
    'pages/rectification/index',
    'pages/mine/index',
    'pages/acceptance-detail/index',
    'pages/rectification-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '桩基验收',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f5f7fa'
  },
  tabBar: {
    color: '#86909c',
    selectedColor: '#165dff',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/project-list/index',
        text: '项目列表'
      },
      {
        pagePath: 'pages/rectification/index',
        text: '整改跟踪'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
