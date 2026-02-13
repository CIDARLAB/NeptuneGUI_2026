import { shallowMount } from '@vue/test-utils'
import App from '@/App.vue'

test('App renders router-view', () => {
  const wrapper = shallowMount(App)
  expect(wrapper.find('router-view-stub').exists()).toBe(true)
})
