//import'Origo';
import { Component, Element as El, Button, dom } from '../../ui';

const FilterMenu = function FilterMenu(options = {}) {
  let {
    target
  } = options;
  const {
    style: styleOptions = {},
    cls: clsOptions = ''
  } = options;
  const defaultStyle = {
    'flex-basis': '220px'
  };

  const styleSettings = Object.assign({}, defaultStyle, styleOptions);
  const style = dom.createStyle(styleSettings);
  const cls = `${clsOptions} padding-x no-grow no-shrink filter-menu`.trim();
  const titles = ["Bebyggelse", "Politik och statistik","Samhällsplanering och bestämmelse","Teknisk infrastruktur","Trafik och kommunikation","Uppleva och göra"];
  let viewer;

  function createButtons(titles, menu){
    let buttons = [];
    titles.forEach(currentTitle => {

      buttons.push(Button({
        cls: "medium rounded width-full light text-align-left text-color-grey text-nowrap text-overflow-ellipsis",
        click() {
        if(this.getState() == 'inactive') {
            document.getElementById(this.getId()).style.backgroundColor = "#dbdbdb";
            this.setState('active');            
          }else{
            document.getElementById(this.getId()).style.backgroundColor = "white";
            this.setState('inactive');  
          }
          let searchText = document.getElementById(menu.getId()).parentNode.getElementsByTagName("input")[0].value
          menu.dispatch("filter:change", { searchText })
        },
        text: currentTitle,
        state: 'inactive',
        data: {title:currentTitle}
      }))

    })
    return buttons;
  }

  function renderButtons(buttons){
    let list = '';
    buttons.forEach(button => {
      list += `<li>${button.render()}</li>`;
    });
    return list;
  }

  let buttons;
  return Component({
    onInit() {
      buttons = createButtons(titles, this);
      this.addComponents(buttons);
    },
    getActiveFilters(){
      let activeFilters = []
      buttons.forEach((button) =>{
        if(button.getState() == 'active'){
          let title = button.data.title
          activeFilters.push(title)
        }
      })
      return activeFilters;
    },
    onRender() {
      this.dispatch('render');
    },
    render() {
      return `<div id="${this.getId()}" class="${cls}" style="${style}">
                <h6 class="text-weight-bold text-grey-dark">Teman</h6>
                <ul>
                  ${renderButtons(buttons)}
                </ul>
              </div>`;
    }
  });
}

export default FilterMenu;