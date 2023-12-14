// DOM selector
const addItem = document.getElementsByClassName('add_item')[0];
const todoText = document.getElementById('create_field');

// Todo display function
const genrateTodos = () => {
    let skip = 0;
    // axios.get('/read-todo').then((response) => {
    axios.get(`/pagination-dashboard?skip=${skip}`).then((response) => {

        if (response.data.status !== 200) {
            alert(response.data.message);
            return;
        }
        const todos = response.data.data;
        const list = document.getElementById('item_list');
        list.insertAdjacentHTML('beforeend',
            todos.map((item) => {
                return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
            <span class="item-text">${item.todo}</span>
            <div>
            <button data-id=${item._id} class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
            <button data-id=${item._id} class="delete-me btn btn-danger btn-sm">Delete</button>
        </div>
        </li>`
            }).join(" ")
        )
        skip += todos.length; // Increament skip by todos length
    }).catch((error) => {
        alert(error);
    })
}

// Create todo
addItem.addEventListener('click', (event) => {
    // event.preventDefault();
    if (todoText.value === "") {
        alert("Please enter todo text");
        return;
    } else {
        axios.post('/create-item', { todo: todoText.value }).then((response) => {
            // console.log(response.data)
            if (response.data.status === 201) {
                alert(response.data.message);
            }
            todoText.value = "";
        }).catch((error) => {
            // console.log(error);
            alert(error);
        })
    }

})

// Edit and delete todos APIs
document.addEventListener('click', (event) => {

    // Edit todo
    if (event.target.classList.contains("edit-me")) {
        const userId = event.target.getAttribute('data-id');
        const updateData = prompt('Enter your new todo text.');
        const itemText = document.getElementsByClassName('item-text')[0];
        axios.put('/edit-item', { id: userId, newData: updateData }).then((response) => {
            // console.log(response.data);
            if (response.data.status !== 200) {
                alert(response.data.message);
            }
            itemText.innerHTML = updateData;
            return;
        }).catch((error) => {
            alert(error)
        })
    }

    // Delete todo
    if (event.target.classList.contains("delete-me")) {
        const userId = event.target.getAttribute('data-id');
        axios.delete('/delete-item', { data: { id: userId } }).then((response) => {
            if (response.data.status !== 201) {
                confirm("Do you want to delete todo.");
                alert(response.data.message);
            }
            event.target.parentElement.parentElement.remove();
        }).catch((error) => {
            alert(error);
        })
    }

    // Show more
    if (event.target.classList.contains('show-more')) {
        genrateTodos();
    }
})


window.onload = () => {
    genrateTodos();
}




